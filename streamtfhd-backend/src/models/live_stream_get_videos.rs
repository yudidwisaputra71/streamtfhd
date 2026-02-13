use sqlx::{Pool, Postgres};
use tracing::{error, debug};

use crate::{dto::live_stream_get_videos::Video, errors::AppError};

pub async fn get_videos(
    owner: &String,
    pool: &Pool<Postgres>
) -> Result<Vec<Video>, AppError> {
    let sql = format!(
        r#"
        SELECT id, title, file, thumbnail, width, height, length
        FROM videos
        WHERE owner = $1
        ORDER BY id DESC
        "#
    );

    let videos_result = sqlx::query_as::<_, Video>(&sql)
        .bind(owner)
        .fetch_all(pool)
        .await;

    match videos_result {
        Ok(val) => {
            return Ok(val);
        }
        Err(err) => {
            error!("Failed to get videos from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    }
}