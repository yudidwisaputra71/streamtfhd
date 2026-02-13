use sqlx::{Pool, Postgres};
use tracing::{error, debug};

use crate::errors::AppError;

pub async fn delete_all(
    owner: &String,
    pool: &Pool<Postgres>
) -> Result<bool, AppError> {
    let res = sqlx::query(
        r#"
        DELETE FROM live_stream_history
        WHERE owner = $1
        "#
    )
        .bind(owner)
        .execute(pool)
        .await;
    let result = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to delete all live stream history from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(result.rows_affected() > 0)
}