use sqlx::{Pool, Postgres};
use tracing::{error, debug};

use crate::errors::AppError;

pub async fn get_live_stream_history_owner(
    id: i64,
    pool: &Pool<Postgres>
) -> Result<Option<String>, AppError> {
    let res: Result<Option<String>, sqlx::Error> = sqlx::query_scalar(
        "SELECT owner FROM live_stream_history WHERE id = $1"
    )
        .bind(id)
        .fetch_optional(pool)
        .await;

    let result = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get live stream history owner.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(result)
}

pub async fn delete_history(
    id: i64,
    pool: &Pool<Postgres>
) -> Result<bool, AppError> {
    let res = sqlx::query(
        r#"
        DELETE FROM live_stream_history
        WHERE id = $1
        "#
    )
        .bind(id)
        .execute(pool)
        .await;
    let result = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to delete live stream history from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(result.rows_affected() > 0)
}