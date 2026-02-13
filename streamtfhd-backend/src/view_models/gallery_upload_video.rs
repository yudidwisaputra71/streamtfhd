use actix_multipart::Multipart;
use actix_web::HttpRequest;
use crate::errors::AppError;
use tracing::{error, debug, warn};
use std::env::var;
use crate::utils::token::{decode_token, get_jwt_from_header};
use crate::utils::user::get_user_id_from_username;
use sqlx::{Pool, Postgres};
use crate::models::gallery_upload_video;
use std::process::Command;

fn is_ffmpeg_installed() -> Result<bool, AppError> {
    let output = match Command::new("which").arg("ffmpeg").output() {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to execute external program.");
            debug!("{}", err);

            return Err(AppError::InternalError(String::from("Failed to execute external program")));
        }
    };
    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();

    if ! stdout.contains("ffmpeg") {
        return Ok(false);
    }

    Ok(true)
}

pub async fn upload_video(
    pool: &Pool<Postgres>,
    req: &HttpRequest,
    payload: Multipart
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
            warn!("An attemp to access upload video endpoint without credentials 1.");

            return Err(AppError::Unauthorized);
        }
    };
    let claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to access upload video endpoint with invalid credentials 2.");

            return Err(AppError::Unauthorized);
        }
    };
    let user_id = match get_user_id_from_username(claims.username, pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to access upload video endpoint with invalid credentials 3.");

            return Err(AppError::Unauthorized);
        }
    };

    let is_ffmpeg_installed = match is_ffmpeg_installed() {
        Ok(val) => val,
        Err(err) => {
            return Err(err);
        }
    };

    if ! is_ffmpeg_installed {
        return Err(AppError::InternalError(String::from("ffmpeg is not installed")));
    }

    let upload = gallery_upload_video::upload_video(payload, &pool, &upload_directory, &user_id).await?;

    Ok(upload)
}