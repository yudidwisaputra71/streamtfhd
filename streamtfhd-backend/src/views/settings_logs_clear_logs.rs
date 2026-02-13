use actix_web::{HttpRequest, HttpResponse};
use crate::errors::AppError;
use serde_json::json;
use crate::view_models::settings_logs_clear_logs;

pub async fn clear_log(req: HttpRequest) -> Result<HttpResponse, AppError> {

    let ret = settings_logs_clear_logs::clear_logs(&req)?;

    let response_json = json!({
        "response": true,
        "clear_logs": ret
    });

    Ok(HttpResponse::Ok().json(response_json))
}