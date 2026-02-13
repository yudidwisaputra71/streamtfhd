use actix_web::{HttpRequest, HttpResponse, web};
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::errors::AppError;
use crate::view_models::history_delete_all;

pub async fn delete_all(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>,
) -> Result<HttpResponse, AppError> {
    let delete_all = history_delete_all::delete_all(&req, &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "delete_all": delete_all
    });

    Ok(HttpResponse::Ok().json(response_json))
}