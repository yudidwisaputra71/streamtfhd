use actix_multipart::Multipart;
use actix_web::{HttpRequest, HttpResponse, web};
use crate::errors::AppError;
use serde_json::json;
use crate::view_models::gallery_upload_video;
use sqlx::{Pool, Postgres};

pub async fn upload_video(
    payload: Multipart,
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>
) -> Result<HttpResponse, AppError> {
    let upload = gallery_upload_video::upload_video(&pool, &req, payload).await?;

    let response_json = json!({
        "response": upload,
        "upload": upload
    });

    Ok(HttpResponse::Ok().json(response_json))
}