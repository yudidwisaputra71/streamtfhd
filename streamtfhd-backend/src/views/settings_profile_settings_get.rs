use actix_web::{web, HttpResponse, HttpRequest};
use sqlx::{Pool, Postgres};
use crate::errors::AppError;
use serde_json::json;

pub async fn settings_profile_settings_get(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>
) -> Result<HttpResponse, AppError> {
    let profile_data = crate::view_models::settings_profile_settings_get::settings_profile_settings_get(&req, pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "data": profile_data
    });

    Ok(HttpResponse::Ok().json(response_json))
}