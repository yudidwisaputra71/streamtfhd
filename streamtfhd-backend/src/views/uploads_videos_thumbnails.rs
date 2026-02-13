use actix_web::{web, HttpResponse};
use serde::Deserialize;
use std::fs;
use std::io;
use crate::errors::AppError;
use std::env::var;
use tracing::{error, debug};

#[derive(Deserialize)]
pub struct Query {
    file: Option<String>
}

fn get(path: String) -> Result<HttpResponse, AppError> {
    let upload_dir = match var("UPLOAD_DIRECTORY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing UPLOAD_DIRECTORY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };
    let file_path = format!("{}/videos/thumbnails/{}", upload_dir, path);

    match fs::read(&file_path) {
        Ok(val) => {
            let mime = get_mime_type(path);
            return Ok(HttpResponse::Ok().content_type(mime).body(val));
        }
        Err(err) => {
            if err.kind() == io::ErrorKind::NotFound {
                return Err(AppError::NotFound);
            } else {
                return Err(AppError::InternalError(String::from(String::from("Failed to read file"))));
            }
        }
    }
}

fn get_mime_type(file_path: String) -> mime_guess::Mime {
    // Detect mime type by file extension
    let mime_type = mime_guess::from_path(file_path).first_or(mime_guess::mime::APPLICATION_OCTET_STREAM);
    let str = mime_type;

    str
}

pub async fn uploads_videos_thumbnails(query: web::Query<Query>) -> Result<HttpResponse, AppError> {
    let file = match query.file.clone() {
        Some(val) => val,
        None => {
            return Err(AppError::BadRequest("Missing file URL parameter.".to_string()));
        }
    };
    Ok(get(file)?)

}