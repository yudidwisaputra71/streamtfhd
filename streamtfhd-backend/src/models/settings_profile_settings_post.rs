use crate::errors::AppError;
use sqlx::{Pool, Postgres};
use crate::dto::settings_profile_settings_post::ProfileSettingsData;
use tracing::{error, debug};

pub async fn update_user(
    user_id: &String,
    pool: &Pool<Postgres>,
    data: &ProfileSettingsData
) -> Result<bool, AppError> {
    let res = sqlx::query(
        r#"
        UPDATE users
        SET avatar = $1, username = $2
        WHERE id = $3
        "#
    )
    .bind(data.avatar.clone())
    .bind(data.username.clone())
    .bind(user_id)
    .execute(pool)
    .await;
    let result = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to update user table.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(result.rows_affected() > 0)
}