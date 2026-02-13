use actix_web::{HttpResponse, HttpRequest};
use crate::errors::AppError;
use serde_json::json;
use std::env::var;

pub async fn check_credentials(req: HttpRequest) -> Result<HttpResponse, AppError> {
    let secret_key = var("JWT_SECRET_KEY")?;
    let check = crate::utils::user::check_credentials(secret_key, &req)?;

    let response_json = json!({
        "response": check,
        "have_credentials": check
    });

    Ok(HttpResponse::Ok().json(response_json))
}