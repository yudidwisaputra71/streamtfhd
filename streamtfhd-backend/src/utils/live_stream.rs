use anyhow::Result;
use sqlx::{Pool, Postgres};
use tokio::process::{Child, Command};
use std::process::Stdio;
use std::sync::Arc;
use tokio::{
    io::{AsyncBufReadExt, BufReader},
    process::ChildStderr,
};
use tracing::{info, warn};
use std::env::var;
use tracing::{error, debug};
use tokio::time::Duration;
use nix::unistd::setsid;
use nix::sys::signal::{killpg, Signal};
use nix::unistd::Pid;

use crate::{
    dto::live_stream_state::{
        LiveStreamState,
        StreamStatus,
        StreamJob
    },
    dto::live_stream_start::LiveStreamData,
    errors::AppError,
    utils::time::current_unix_timestamp,
    models::{
        live_stream_write_history,
        live_stream_update_start_time,
        live_stream_empty_schedule
    },
    dto::live_stream_write_history::History
};

fn spawn_ffmpeg(
    video: &String,
    rtmp_url: &String,
    stream_key: &String,
    stream_loop: i32
) -> Result<Child, std::io::Error> {
    info!("spawning ffmpeg using {}", video);

    let youtube_rtmp = format!("{}/{}", rtmp_url, stream_key);

    let mut cmd = Command::new("ffmpeg");

    if stream_loop > 1 {
        info!("ffmpeg -stream_loop {} -re -i {} -progress pipe:2 -stats_period 1 -c:v copy -preset veryfast -tune zerolatency -c:a copy -f flv {}", stream_loop, video, youtube_rtmp);
        cmd.args([
                "-stream_loop", &stream_loop.to_string(),
                "-re",
                "-i", video,

                // machine-readable progress
                "-progress", "pipe:2",
                "-stats_period", "1",
                
                "-c:v", "copy",
                "-preset", "veryfast",
                "-tune", "zerolatency",
                "-c:a", "copy",
                "-f", "flv",
                &youtube_rtmp,
            ])
            .stderr(Stdio::piped())
            .stdout(Stdio::null());
    } else {
        info!("ffmpeg -re -i {} -progress pipe:2 -stats_period 1 -c:v copy -preset veryfast -tune zerolatency -c:a copy -f flv {}", video, youtube_rtmp);
        cmd.args([
                "-re",
                "-i", video,

                // machine-readable progress
                "-progress", "pipe:2",
                "-stats_period", "1",

                "-c:v", "copy",
                "-preset", "veryfast",
                "-tune", "zerolatency",
                "-c:a", "copy",
                "-f", "flv",
                &youtube_rtmp,
            ])
            .stderr(Stdio::piped())
            .stdout(Stdio::null());
    }

    unsafe {
        cmd.pre_exec(|| {
            setsid().map_err(|e| {
                std::io::Error::new(std::io::ErrorKind::Other, e)
            })?;
            Ok(())
        });
    }

    Ok(cmd.spawn()?)
}

fn monitor_ffmpeg(
    stream_id: i64,
    stderr: ChildStderr,
    state: Arc<LiveStreamState>,
    pool: &Pool<Postgres>
) {
    let pool_clone = pool.clone();
    tokio::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();

        while let Ok(Some(line)) = lines.next_line().await {
            if line == "progress=continue" {
                if let Some(mut job) = state.jobs.get_mut(&stream_id) {
                    if matches!(job.status, StreamStatus::Starting) {
                        job.status = StreamStatus::Live;
                    }
                }
            }

            if line == "progress=end" {
                info!(%stream_id, "ffmpeg finished");
                stop_stream_internal(
                    &state,
                    stream_id,
                    StreamStatus::Stopped,
                    &pool_clone
                )
                .await;
                return;
            }

            if line.contains("error") {
                warn!(%stream_id, "ffmpeg error: {}", line);
                stop_stream_internal(
                    &state,
                    stream_id,
                    StreamStatus::Failed(line),
                    &pool_clone
                )
                .await;
                return;
            }
        }
    });
}

/*
pub async fn restart_stream(
    live_stream_id: &String,
    state: &Arc<LiveStreamState>,
    pool: &Pool<Postgres>
) -> 
*/

pub async fn start_stream(
    live_stream_data: &LiveStreamData,
    state: &Arc<LiveStreamState>,
    pool: &Pool<Postgres>
) -> Result<i64, AppError> {
    if let Some(job) = state.jobs.get_mut(&live_stream_data.id) {

        debug!("Live stream with id={} status is {:#?}", live_stream_data.id, job.status);

        match job.status {
            StreamStatus::Live => return Err(AppError::LiveStreamAlreadyLive),
            StreamStatus::Scheduled => return Err(AppError::LiveStreamAlreadyScheduled),
            _ => return Err(AppError::LiveStreamConflict)
        }
    }

    info!("Starting live stream with id {}.", live_stream_data.id);

    let live_stream_data_clone = live_stream_data.clone();
    let upload_dir = match var("UPLOAD_DIRECTORY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing UPLOAD_DIRECTORY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };
    let video_file = format!("{}/videos/{}", upload_dir, live_stream_data_clone.video_file);
    let stream_id = live_stream_data_clone.id;
    let cancel_notify = Arc::new(tokio::sync::Notify::new());

    let pool_clone = pool.clone();
    
    state.jobs.insert(stream_id, StreamJob {
        id: stream_id,
        owner: live_stream_data_clone.owner,
        schedule_start: live_stream_data_clone.schedule_start,
        schedule_end: live_stream_data.schedule_end,
        actual_start: None,
        actual_stop: None,
        status: StreamStatus::Offline,
        child: None,
        cancel_notify: cancel_notify.clone(),
        is_finalized: false
    });

    let state_clone = state.clone();

    tokio::spawn(async move {
        if let Some(start_at) = live_stream_data_clone.schedule_start {
            let now = current_unix_timestamp() as i64;

            debug!("Started in {} secs.", (start_at - now));

            if start_at > now {
                if let Some(mut job) = state_clone.jobs.get_mut(&stream_id) {
                    job.status = StreamStatus::Scheduled;
                }

                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_secs((start_at - now) as u64)) => {}
                    _ = cancel_notify.notified() => {
                        stop_stream_internal(&state_clone, stream_id, StreamStatus::Cancelled, &pool_clone).await;

                        return;
                    }
                }
            }
        }

        live_stream_update_start_time::update_start_time(stream_id, &pool_clone).await;

        let mut child = match spawn_ffmpeg(
                &video_file,
                &live_stream_data_clone.rtmp_url,
                &live_stream_data_clone.stream_key,
                live_stream_data_clone.stream_loop
        ) {
            Ok(c) => c,
            Err(e) => {
                error!("Error while spawning ffmpeg.");
                debug!("{}.", e);

                stop_stream_internal(&state_clone, stream_id, StreamStatus::Failed(e.to_string()), &pool_clone).await;

                return;
            }
        };

        let stderr = child.stderr.take().unwrap();

        if let Some(mut job) = state_clone.jobs.get_mut(&stream_id) {
            job.actual_start = Some(current_unix_timestamp() as i64);
            job.status = StreamStatus::Starting;
            job.child = Some(child);
        }

        monitor_ffmpeg(stream_id, stderr, state_clone.clone(), &pool_clone);

        if let Some(stop_at) = live_stream_data_clone.schedule_end {
            let now = current_unix_timestamp() as i64;

            debug!("Stop in {} secs.", (stop_at - now));

            if stop_at > now {
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_secs((stop_at - now) as u64)) => {}
                    _ = cancel_notify.notified() => return,
                }

                stop_stream_internal(&state_clone, stream_id, StreamStatus::Done, &pool_clone).await;
            }
        }
    });

    Ok(stream_id)
}

pub async fn write_history(
    state: &Arc<LiveStreamState>,
    stream_id: i64,
    pool: &Pool<Postgres>,
    final_status: StreamStatus
) {
    if let Some((_, job)) = state.jobs.remove(&stream_id) {
        info!(%stream_id, "writing stream history");

        let owner = match live_stream_write_history::get_live_stream_owner(stream_id, &pool).await {
            Some(val) => val,
            None => String::from("None")
        };

        let start_time = match job.actual_start {
            Some(val) => val,
            None => 0
        };

        let end_status = match final_status {
            StreamStatus::Done => String::from("Done"),
            StreamStatus::Stopped => String::from("Stopped"),
            StreamStatus::Cancelled => String::from("Canceled"),
            StreamStatus::Failed(_) => String::from("Failed"),
            _ => String::from("Unknown")
        };

        let data = History {
            owner: owner,
            live_stream: stream_id,
            start_time: start_time,
            end_time: current_unix_timestamp() as i64,
            end_status: end_status
        };

        live_stream_write_history::write_history(&data, &pool).await;
    }
}

pub async fn stop_stream_internal(
    state: &Arc<LiveStreamState>,
    stream_id: i64,
    final_status: StreamStatus,
    pool: &Pool<Postgres>
) {
    live_stream_empty_schedule::empty_schedule(stream_id, &pool).await;

    let child = {
        if let Some(mut job) = state.jobs.get_mut(&stream_id) {
            if job.is_finalized {
                return;
            }
            job.is_finalized = true;
            job.cancel_notify.notify_waiters();
            job.child.take()
        } else {
            return;
        }
    };

    if let Some(mut child) = child {
        if let Some(pid) = child.id() {
            let pgid = Pid::from_raw(pid as i32);

            info!(%stream_id, pid, "SIGTERM ffmpeg group");
            let _ = killpg(pgid, Signal::SIGTERM);

            tokio::time::sleep(std::time::Duration::from_millis(500)).await;

            info!(%stream_id, pid, "SIGKILL ffmpeg group");
            let _ = killpg(pgid, Signal::SIGKILL);
        }

        let _ = child.wait().await;
    }

    write_history(state, stream_id, &pool, final_status).await;
}