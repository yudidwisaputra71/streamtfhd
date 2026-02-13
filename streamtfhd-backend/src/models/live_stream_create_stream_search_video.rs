use sqlx::{Pool, Postgres};
use tracing::{error, debug};

use crate::{dto::live_stream_create_stream_search_video::Video, errors::AppError};

pub async fn search_video(
    owner: &String,
    keyword: &String,
    pool: &Pool<Postgres>
) -> Result<Vec<Video>, AppError> {
    let sql = format!(
        r#"
        SELECT id, title, file, thumbnail, width, height, length
        FROM videos
        WHERE owner = $1 AND title ILIKE $2
        ORDER BY id DESC
        "#
    );
    let like_pattern = format!("%{}%", keyword);

    let videos_result = sqlx::query_as::<_, Video>(&sql)
        .bind(owner)
        .bind(like_pattern)
        .fetch_all(pool)
        .await;

    match videos_result {
        Ok(val) => {
            return Ok(val);
        }
        Err(err) => {
            error!("Failed to get video from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    }
}