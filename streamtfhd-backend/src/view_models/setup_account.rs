use crate::errors::AppError;
use argon2::password_hash;
use argon2::PasswordHasher;
use crate::view_models::setup_account::password_hash::rand_core;
use sqlx::{Pool, Postgres};
use tracing::{error, debug};
use uuid::Uuid;

pub struct AddUser {
    pub id: String,
    pub avatar: Option<String>,
    pub username: String,
    pub password_hash: String,
    pub role: u8,
    pub created_at: u64
}

pub async fn add_user(
    pool: &Pool<Postgres>,
    data: crate::views::setup_account::AddUser
) -> Result<bool, AppError> {
    let salt = argon2::password_hash::SaltString::generate(&mut rand_core::OsRng);
    let argon2 = argon2::Argon2::default();
    let password_hash = match argon2.hash_password(data.password.as_bytes(), &salt) {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to hash password.");
            debug!("{}", err.to_string());

            return Err(AppError::HashPasswordFailed);
        }
    };

    let add_user_data = AddUser {
        id: Uuid::new_v4().to_string(),
        avatar: data.avatar,
        username: data.username,
        password_hash: password_hash.to_string(),
        role: 0,
        created_at: crate::utils::time::current_unix_timestamp()
    };

    let add_user = crate::models::setup_account::add_user(&pool, add_user_data).await?;

    Ok(add_user)
}