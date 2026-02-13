use actix_web::HttpRequest;
use actix_web::{web, HttpResponse};
use serde::Deserialize;
use crate::errors::AppError;
use crate::view_models::uploads_videos;

#[derive(Deserialize)]
pub struct Query {
    file: Option<String>
}

pub async fn uploads_videos(
    req: HttpRequest,
    query: web::Query<Query>
) -> Result<HttpResponse, AppError> {
    let video_file = match query.file.clone() {
        Some(val) => val,
        None => {
            return Err(AppError::BadRequest("Missing file in URL parameter.".to_string()));
        }
    };

    Ok(uploads_videos::stream_video(&video_file, &req).await?)
}