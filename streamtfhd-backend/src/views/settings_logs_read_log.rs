use actix_web::{web, HttpRequest, HttpResponse};
use crate::errors::AppError;
use serde_json::json;

pub async fn read_log(
    last_n_lines: web::Path<usize>,
    req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let log = crate::view_models::settings_logs_read_log::read_log(last_n_lines.into_inner(), &req)?;

    let response_json = json!({
        "response": true,
        "data": log
    });

    Ok(HttpResponse::Ok().json(response_json))
}