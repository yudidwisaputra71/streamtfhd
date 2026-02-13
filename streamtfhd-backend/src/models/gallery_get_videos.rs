use sqlx::{Pool, Postgres};
use crate::{dto::gallery_get_videos::Video, errors::AppError};
use tracing::{error, debug};

pub async fn get_total_videos(pool: &Pool<Postgres>) -> Result<i64, AppError> {
    let result = sqlx::query_as(
        "SELECT COUNT(id) FROM videos"
    )
    .fetch_optional(pool)
    .await;

    let result_option: Option<(i64,)> = match result {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get total videos.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    let count = match result_option {
        Some(val) => val.0,
        None => 0 as i64
    };

    Ok(count)
}

pub async fn get_videos_paginated(
    pool: &Pool<Postgres>,
    user_id: &String,
    page: u32,
    page_size: u32,
    order: &String,
) -> Result<Vec<Video>, AppError> {
    let offset = (page.saturating_sub(1) * page_size) as i64;

    let order_clause = match order.to_lowercase().as_str() {
        "oldest" => "ASC",
        "newest" => "DESC",
        _ => "DESC",
    };

    let sql = format!(
        r#"
        SELECT id, owner, title, file, thumbnail, size, uploaded_at
        FROM videos
        WHERE owner = $1
        ORDER BY id {}
        LIMIT $2 OFFSET $3
        "#,
        order_clause
    );

    let videos = sqlx::query_as::<_, Video>(&sql)
    .bind(user_id)
    .bind(page_size as i64)
    .bind(offset)
    .fetch_all(pool)
    .await;

    let videos_ret = match videos {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get videos from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(videos_ret)
}