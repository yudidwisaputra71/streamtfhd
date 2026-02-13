use sqlx::{Pool, Postgres};
use tracing::{error, debug};

use crate::errors::AppError;

pub async fn get_avatar(
    user_id: &String,
    pool: &Pool<Postgres>
) -> Result<Option<String>, AppError> {
    let res: Result<Option<String>, sqlx::Error> = sqlx::query_scalar(
        "SELECT avatar FROM users WHERE id = $1"
    )
    .bind(&user_id)
    .fetch_one(pool)
    .await;

    let val = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get avatar from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(val)
}