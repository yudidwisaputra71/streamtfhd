use sqlx::{Pool, Postgres};
use crate::errors::AppError;
use crate::views::login::LoginData;
use argon2::Argon2;
use argon2::PasswordHash;
use argon2::PasswordVerifier;
use tracing::{error, debug, warn};

pub async fn login(
    pool: &Pool<Postgres>,
    data: LoginData,
    ip_address: &String
) -> Result<bool, AppError> {
    let result = sqlx::query_scalar(
        "SELECT password_hash FROM users WHERE username = $1"
    )
        .bind(data.username.clone())
        .fetch_optional(pool)
        .await;

    let password_hash_option: Option<String> = match result {
        Ok(val) => val,
        Err(err) => {
            error!("Failed get hashed password from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    let password_hash = match password_hash_option {
        Some(val) => val,
        None => {
            warn!("An attemp to login from \"{}\" using \"{}\" user but failed.", ip_address, data.username);
            return Err(AppError::LoginFailed);
        }
    };

    let parsed_hash = PasswordHash::new(&password_hash)?;
    let login = Argon2::default().verify_password(data.password.as_bytes(), &parsed_hash).is_ok();

    Ok(login)
}

#[cfg(test)]
mod tests {

    #[tokio::test]
    async fn login() {
        let pool = crate::models::database::pool(
            "septian".to_string(),
            "674522".to_string(),
            "localhost".to_string(),
            "streamtfhd".to_string()
        ).await.unwrap();

        let data = crate::views::login::LoginData {
            username: "septian".to_string(),
            password: "674522".to_string()
        };

        let login = super::login(&pool, data, &"127.0.0.1".to_string()).await;

        assert_eq!(login.unwrap(), true);
    }
}