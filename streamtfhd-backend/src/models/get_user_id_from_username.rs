use sqlx::{Pool, Postgres};
use tracing::{error, debug};
use crate::errors::AppError;

pub async fn get_user_id_from_username(
    username: String,
    pool: &Pool<Postgres>
) -> Result<Option<String>, AppError> {
    let res = sqlx::query_scalar(
                                "SELECT id FROM users WHERE username = $1"
                                )
                                .bind(username)
                                .fetch_optional(pool)
                                .await;
    
    let value: Option<String> = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get user id from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };
    
    Ok(value)
}