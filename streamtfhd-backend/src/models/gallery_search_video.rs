use sqlx::{Pool, Postgres};
use tracing::{debug, error};
use crate::{dto::gallery_search_video::Video, errors::AppError};

pub async fn search_video(
    owner: &String,
    keyword: &String,
    pool: &Pool<Postgres>
) -> Result<Vec<Video>, AppError> {
    let sql = format!(
        r#"
        SELECT id, owner, title, file, thumbnail, size, uploaded_at
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

    let videos = match videos_result {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to search video(s).");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(videos)
}