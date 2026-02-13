use actix_web::HttpRequest;
use actix_multipart::Multipart;
use crate::errors::AppError;
use crate::utils::user::check_credentials;
use std::env::var;
use tracing::{error, debug, warn};

pub async fn image_upload(
    req: &HttpRequest,
    payload: Multipart
) -> Result<String, AppError> {
    let upload_directory = match var("UPLOAD_DIRECTORY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing UPLOAD_DIRECTORY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
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
    let check_credentials = check_credentials(secret_key, &req)?;

    if !check_credentials {
        warn!("An attemp to upload image without credentials.");
        
        return Err(AppError::Unauthorized);
    }

    let res = crate::models::settings_profile_image_upload::image_upload(payload, &upload_directory).await?;

    Ok(res)
}