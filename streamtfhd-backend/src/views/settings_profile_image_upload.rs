use actix_multipart::Multipart;
use actix_web::{HttpResponse, HttpRequest};
use crate::errors::AppError;
use serde_json::json;
use crate::view_models::settings_profile_image_upload::image_upload;

pub async fn settings_profile_image_upload(
    req: HttpRequest,
    payload: Multipart
) -> Result<HttpResponse, AppError> {
    let res = image_upload(&req, payload).await?;

    let data = json!({
        "image": res
    });
    let response_json = json!({
        "response": true,
        "message": "Image uploaded successfully",
        "data": data
    });

    Ok(HttpResponse::Ok().json(response_json))
}