use sqlx::{Pool, Postgres};
use tracing::{error, debug};
use crate::errors::AppError;
use std::fs;

async fn is_video_used_in_live_stream(
    video_id: i64,
    pool: &Pool<Postgres>
) -> Result<bool, AppError> {
    let result = sqlx::query_as(
        "SELECT COUNT(video) FROM live_streams WHERE video = $1"
    )
    .bind(video_id)
    .fetch_optional(pool)
    .await;

    let result_option: Option<(i64,)> = match result {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get video info.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    let count = match result_option {
        Some(val) => val.0,
        None => 0 as i64
    };

    if count > 0 {
        return Ok(true);
    }

    Ok(false)
}

pub async fn get_video_owner(
    video_id: i64,
    pool: &Pool<Postgres>
) -> Result<Option<String>, AppError> {
    let res: Result<Option<String>, sqlx::Error> = sqlx::query_scalar(
        "SELECT owner FROM videos WHERE id = $1"
    )
        .bind(video_id)
        .fetch_optional(pool)
        .await;

    let result = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get video owner.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(result)
}

async fn get_video_file_and_thumbnail_file(
    video_id: i64,
    pool: &Pool<Postgres>
) -> Result<Option<(String, String)>, AppError> {
    let result = sqlx::query_as::<_, (String, String)>(
        "SELECT file, thumbnail FROM videos WHERE id = $1"
    )
    .bind(video_id)
    .fetch_optional(pool)
    .await;

    let row = match result {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get video file and video thumbnail file.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(row)
}

fn delete_video_file(
    video_file: &String,
    upload_directory: &String
) -> Result<bool, AppError> {
    let video_path = format!("{}/videos/{}", upload_directory, video_file);

    match fs::remove_file(video_path) {
        Ok(_) => (),
        Err(err) => {
            error!("Failed to delete video file.");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    }

    Ok(true)
}

fn delete_thumbnail_file(
    thumbnail_file: &String,
    upload_directory: &String
) -> Result<bool, AppError> {
    let thumbnail_path = format!("{}/videos/thumbnails/{}", upload_directory, thumbnail_file);

    match fs::remove_file(thumbnail_path) {
        Ok(_) => (),
        Err(err) => {
            error!("Failed to delete thumbnail file.");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    }

    Ok(true)
}

pub async fn delete_video(
    video_id: i64,
    upload_directory: &String,
    pool: &Pool<Postgres>
) -> Result<bool, AppError> {
    let is_video_used_in_live_stream = is_video_used_in_live_stream(video_id, &pool).await?;

    if is_video_used_in_live_stream {
        error!("Failed to delete video. The video is used in live stream");
        return Err(AppError::Conflict("Failed to delete video. The video is used in live stream".to_string()))
    }

    let (video, thumbnail) = match get_video_file_and_thumbnail_file(video_id, &pool).await? {
        Some(val) => val,
        None => (String::from(""), String::from(""))
    };
    let res = sqlx::query(
        r#"
        DELETE FROM videos
        WHERE id = $1
        "#
    )
        .bind(video_id)
        .execute(pool)
        .await;
    let result = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to delete video from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    if video.ne("") {
        delete_video_file(&video, &upload_directory)?;
    }

    if thumbnail.ne("") {
        delete_thumbnail_file(&thumbnail, &upload_directory)?;
    }

    Ok(result.rows_affected() > 0)
}