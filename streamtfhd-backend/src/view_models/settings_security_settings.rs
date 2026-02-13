use actix_web::HttpRequest;
use sqlx::{Pool, Postgres};
use crate::errors::AppError;
use crate::dto::settings_security_settings::SecuritySettingsData;
use crate::utils::token::get_jwt_from_header;
use crate::utils::token::decode_token;
use crate::utils::user::get_user_id_from_username;
use crate::models::settings_security_settings::get_current_password;
use std::env::var;
use argon2::Argon2;
use argon2::PasswordHash;
use argon2::PasswordVerifier;
use argon2::PasswordHasher;
use argon2::password_hash;
use crate::view_models::settings_security_settings::password_hash::rand_core;
use tracing::{error, debug, warn};

pub async fn verify_current_password(
    current_password: &String,
    req: &HttpRequest,
    pool: &Pool<Postgres>
) -> Result<bool, AppError> {
    let jwt = match get_jwt_from_header(&req) {
        Some(val) => val,
        None => {
            warn!("An attemp to get password without credentials 1.");
            return Err(AppError::Unauthorized);
        }
    };
    let secret_key = match var("JWT_SECRET_KEY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing JWT_SECRET_KEY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };
    let claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to get password without credentials 2.");
            return Err(AppError::Unauthorized);
        }
    };
    let user_id = match get_user_id_from_username(claims.username, &pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to get password without credentials 3.");
            return Err(AppError::Unauthorized);
        }
    };
    let password_hash = match get_current_password(&user_id, &pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to get password without credentials 4.");
            return Err(AppError::Unauthorized);
        }
    };

    let parsed_hash = PasswordHash::new(&password_hash)?;
    let verify = Argon2::default().verify_password(&current_password.as_bytes(), &parsed_hash).is_ok();

    Ok(verify)
}

pub async fn update_password(
    req: &HttpRequest,
    pool: &Pool<Postgres>,
    data: &SecuritySettingsData
) -> Result<bool, AppError> {
    let jwt = match get_jwt_from_header(&req) {
        Some(val) => val,
        None => {
            warn!("An attemp to update password without credentials.");
            return Err(AppError::Unauthorized);
        }
    };
    let secret_key = match var("JWT_SECRET_KEY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing JWT_SECRET_KEY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };
    let claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to update password without credentials.");
            return Err(AppError::Unauthorized);
        }
    };
    let user_id = match get_user_id_from_username(claims.username, &pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to update password without credentials.");
            return Err(AppError::Unauthorized);
        }
    };

    let new_password = match data.new_password.clone() {
        Some(val) => val,
        None => String::from("")
    };

    let salt = argon2::password_hash::SaltString::generate(&mut rand_core::OsRng);
    let argon2 = argon2::Argon2::default();
    let hashed_password = match argon2.hash_password(new_password.as_bytes(), &salt) {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to hash password.");
            debug!("{}", err.to_string());

            return Err(AppError::HashPasswordFailed);
        }
    };

    let update = crate::models::settings_security_settings::update_password(&user_id, &pool, &hashed_password.to_string()).await?;

    Ok(update)
}