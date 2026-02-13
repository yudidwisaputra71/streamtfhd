use sqlx::{Pool, Postgres};
use tracing::{error, debug};

use crate::{
    dto::live_stream_create_stream::CreateLiveStreamData,
    errors::AppError,
    utils::time::current_unix_timestamp
};

pub async fn create_live_stream(
    owner: &String,
    data: &CreateLiveStreamData,
    pool: &Pool<Postgres>,
) -> Result<i64, AppError> {
    let timestamp = current_unix_timestamp();
    let insert: Result<i64, sqlx::Error> = sqlx::query_scalar(
        "INSERT INTO live_streams (
                owner,
                title,
                video,
                rtmp_url,
                stream_key,
                stream_loop,
                schedule_start,
                schedule_end,
                created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9
            )
            RETURNING id"
    )
        .bind(owner)
        .bind(&data.title)
        .bind(data.video)
        .bind(&data.rtmp_url)
        .bind(&data.stream_key)
        .bind(data.stream_loop)
        .bind(data.schedule_start)
        .bind(data.schedule_end)
        .bind(timestamp as i64)
        .fetch_one(pool)
        .await;

    match insert {
        Ok(val) => {
            return Ok(val)
        }
        Err(err) => {
            error!("Failed to insert live stream data to database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    }
}