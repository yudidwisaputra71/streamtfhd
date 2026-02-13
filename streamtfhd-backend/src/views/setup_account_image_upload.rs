use actix_multipart::Multipart;
use actix_web::HttpResponse;
use crate::errors::AppError;
use serde_json::json;

pub async fn setup_account_image_upload(payload: Multipart) -> Result<HttpResponse, AppError> {
    let image = crate::view_models::setup_account_image_upload::image_upload(payload).await?;

    let response_json = json!({
        "response": true,
        "image": image
    });

    Ok(HttpResponse::Ok().json(response_json))
}