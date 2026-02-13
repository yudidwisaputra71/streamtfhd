use actix_multipart::Multipart;
use crate::errors::AppError;
use std::env::var;
use tracing::{error, debug};

pub async fn image_upload(payload: Multipart) -> Result<String, AppError> {
    let upload_directory = match var("UPLOAD_DIRECTORY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing UPLOAD_DIRECTORY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };

    let res = crate::models::setup_account_image_upload::image_upload(payload, &upload_directory).await?;

    Ok(res)
}