use crate::errors::AppError;
use sqlx::{Pool, Postgres};
use actix_web::HttpRequest;
use tracing::{warn, error, debug};
use std::env::var;
use crate::utils::token::{get_jwt_from_header, decode_token};
use crate::utils::user::get_user_id_from_username;
use crate::models::gallery_delete_all_videos;

pub async fn delete_all_videos(
    pool: &Pool<Postgres>,
    req: &HttpRequest,
) -> Result<bool, AppError> {
    let secret_key = match var("JWT_SECRET_KEY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing JWT_SECRET_KEY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };
    let upload_directory = match var("UPLOAD_DIRECTORY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing UPLOAD_DIRECTORY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };
    let jwt = match get_jwt_from_header(&req) {
        Some(val) => val,
        None => {
            warn!("An attemp to access delete all video endpoint without credentials 1.");

            return Err(AppError::Unauthorized);
        }
    };
    let claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to access delete all video endpoint with invalid credentials 2.");

            return Err(AppError::Unauthorized);
        }
    };
    let user_id = match get_user_id_from_username(claims.username, pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to access delete all video endpoint with invalid credentials 3.");

            return Err(AppError::Unauthorized);
        }
    };

    let delete = gallery_delete_all_videos::delete_all_videos(&user_id, &upload_directory, &pool).await?;

    Ok(delete)
}