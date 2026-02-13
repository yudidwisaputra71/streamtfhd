use sqlx::{Pool, Postgres, prelude::FromRow};
use tracing::{error, debug};

use crate::{
    errors::AppError,
    dto::live_stream_edit_stream_get
};

#[derive(Debug, FromRow)]
struct LiveStream {
    id: i64,
    title: String,
    video: i64,
    rtmp_url: String,
    stream_key: String,
    stream_loop: i32,
    schedule_start: Option<i64>,
    schedule_end: Option<i64>
}

pub async fn get_live_stream_owner(
    id: i64,
    pool: &Pool<Postgres>
) -> Result<Option<String>, AppError> {
    let res: Result<Option<String>, sqlx::Error> = sqlx::query_scalar(
        "SELECT owner FROM live_streams WHERE id = $1"
    )
        .bind(id)
        .fetch_optional(pool)
        .await;

    let ret = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get live stream owner from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(ret)
}

async fn get_live_stream_data(
    id: i64,
    pool: &Pool<Postgres>
) -> Result<Option<LiveStream>, AppError> {
    let live_stream_result = sqlx::query_as::<_, LiveStream>(
        r#"
        SELECT id, title, video, rtmp_url, stream_key, stream_loop, schedule_start, schedule_end
        FROM live_streams
        WHERE id = $1
        "#
    )
    .bind(id)
    .fetch_optional(pool)
    .await;

    let live_stream_option = match live_stream_result {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get live stream data from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(live_stream_option)
}

async fn get_video_data(
    id: i64,
    pool: &Pool<Postgres>
) -> Result<Option<live_stream_edit_stream_get::Video>, AppError> {
    let video_result = sqlx::query_as::<_, live_stream_edit_stream_get::Video>(
        r#"
        SELECT id, title, file, thumbnail
        FROM videos
        WHERE id = $1
        "#
    )
    .bind(id)
    .fetch_optional(pool)
    .await;

    let video_option = match video_result {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get video data from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(video_option)
}

pub async fn get_live_stream(
    id: i64,
    pool: &Pool<Postgres>
) -> Result<Option<live_stream_edit_stream_get::LiveStream>, AppError> {
    let live_stream_option = get_live_stream_data(id, &pool).await?;
    let live_stream = match live_stream_option {
        Some(val) => val,
        None => {
            return Ok(None);
        }
    };
    let video_option = get_video_data(live_stream.video, &pool).await?;
    let ret = live_stream_edit_stream_get::LiveStream {
        id: live_stream.id,
        title: live_stream.title,
        video: video_option,
        rtmp_url: live_stream.rtmp_url,
        stream_key: live_stream.stream_key,
        stream_loop: live_stream.stream_loop,
        schedule_start: live_stream.schedule_start,
        schedule_end: live_stream.schedule_end
    };

    Ok(Some(ret))
}