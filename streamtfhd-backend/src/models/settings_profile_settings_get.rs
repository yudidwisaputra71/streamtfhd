use sqlx::{Pool, Postgres};
use crate::errors::AppError;
use tracing::{error, debug};
use crate::dto::settings_profile_settings_get::Profile;

pub async fn settings_profile_settings_get(
    username: String,
    pool: &Pool<Postgres>
) -> Result<Option<Profile>, AppError> {
    let res = sqlx::query_as::<_, Profile>(
                                    r#"
                                    SELECT avatar, username
                                    FROM users
                                    WHERE username = $1
                                    "#
                                )
                                .bind(username)
                                .fetch_optional(pool)
                                .await;
    let res_option = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get user data from the database.");
            debug!("{}", err.to_string());

            return Err(AppError::Database(err));
        }
    };

    Ok(res_option)
}