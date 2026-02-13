use actix_web::HttpRequest;
use crate::errors::AppError;
use sqlx::{Pool, Postgres};
use crate::dto::settings_profile_settings_post::ProfileSettingsData;
use crate::utils::token::get_jwt_from_header;
use crate::utils::token::decode_token;
use crate::utils::user::get_user_id_from_username;
use std::env::var;
use tracing::{error, debug, warn};

pub async fn update_user(
    req: &HttpRequest,
    pool: &Pool<Postgres>,
    data: &ProfileSettingsData
) -> Result<bool, AppError> {
    let jwt = match get_jwt_from_header(&req) {
        Some(val) => val,
        None => {
            warn!("An attemp to update user without credentials.");
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
            warn!("An attemp to update user without credentials.");
            return Err(AppError::Unauthorized);
        }
    };
    let user_id = match get_user_id_from_username(claims.username, &pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to update user without credentials.");
            return Err(AppError::Unauthorized);
        }
    };
    let update = crate::models::settings_profile_settings_post::update_user(&user_id, &pool, &data).await?;

    Ok(update)
}