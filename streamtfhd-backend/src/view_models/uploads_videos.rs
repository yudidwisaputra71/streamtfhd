use actix_web::{HttpRequest, HttpResponse};
use tracing::{error, debug};
use std::env::var;

use crate::{errors::AppError, models::uploads_videos};


pub async fn stream_video(
    video_file: &String,
    req: &HttpRequest
) -> Result<HttpResponse, AppError> {
    let upload_directory = match var("UPLOAD_DIRECTORY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing UPLOAD_DIRECTORY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };
    let stream = uploads_videos::stream_video(&video_file, &upload_directory, &req).await?;

    Ok(stream)
}