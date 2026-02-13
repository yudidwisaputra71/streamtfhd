use sqlx::{Pool, Postgres};
use crate::errors::AppError;
use tracing::{error, debug};

pub async fn get_current_password(
    user_id: &String,
    pool: &Pool<Postgres>
) -> Result<Option<String>, AppError> {
    let res = sqlx::query_scalar(
        "SELECT password_hash FROM users WHERE id = $1"
    )
        .bind(user_id)
        .fetch_optional(pool)
        .await;

    let res_option: Option<String> = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get password from database");
            debug!("{}", err.to_string());

            return Err(AppError::Database(err));
        }
    };

    Ok(res_option)
}

pub async fn update_password(
    user_id: &String,
    pool: &Pool<Postgres>,
    hashed_password: &String
) -> Result<bool, AppError> {
    let res = sqlx::query(
        r#"
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
        "#
    )
        .bind(hashed_password)
        .bind(user_id)
        .execute(pool)
        .await;

    let result = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to update password.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(result.rows_affected() > 0)
}