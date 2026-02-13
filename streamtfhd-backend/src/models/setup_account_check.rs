use sqlx::{Pool, Postgres};
use tracing::{error, debug};

use crate::errors::AppError;

pub async fn check(pool: &Pool<Postgres>) -> Result<bool, AppError> {
    let count_result: Result<i64, sqlx::Error> = sqlx::query_scalar(
        r#"
        SELECT COUNT(id)
        FROM users
        WHERE role = 0
        "#
    )
    .fetch_one(pool)
    .await;

    let count = match count_result {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to check if user is exist in database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(count == 0)
}