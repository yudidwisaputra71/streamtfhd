use crate::errors::AppError;
use sqlx::{Pool, Postgres};
use tracing::{error, debug};

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

pub async fn rename_video(
    video_id: &i64,
    new_video_name: &String,
    pool: &Pool<Postgres>
) -> Result<bool, AppError> {
    let res = sqlx::query(
        r#"
        UPDATE videos
        SET title = $1
        WHERE id = $2
        "#
    )
        .bind(new_video_name)
        .bind(video_id)
        .execute(pool)
        .await;
    let result = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to change video title.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(result.rows_affected() > 0)
}