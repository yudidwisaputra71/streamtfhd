use actix_web::HttpRequest;
use sqlx::{Pool, Postgres};
use crate::errors::AppError;
use crate::utils::token::decode_token;
use crate::utils::token::get_jwt_from_header;
use std::env::var;
use crate::dto::settings_profile_settings_get::Profile;
use tracing::{error, debug, warn};

pub async fn settings_profile_settings_get(
    req: &HttpRequest,
    pool: &Pool<Postgres>
) -> Result<Profile, AppError> {
    let token = match get_jwt_from_header(req) {
        Some(val) => val,
        None => {
            warn!("An attempt trying to access settings profile endpoint without credentials.");

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
    let claims = match decode_token(&token, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attempt trying to access settings profile endpoint without credentials.");

            return Err(AppError::Unauthorized)
        }
    };
    let profile_data = match crate::models::settings_profile_settings_get::settings_profile_settings_get(claims.username, pool).await? {
        Some(val) => val,
        None => {
            return Err(AppError::Unauthorized);
        }
    };

    Ok(profile_data)

}