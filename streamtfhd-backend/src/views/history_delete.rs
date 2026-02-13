use actix_web::{HttpRequest, HttpResponse, web};
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::errors::AppError;
use crate::view_models::history_delete;

pub async fn delete_history(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>,
    path: web::Path<i64>
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let delete = history_delete::delete_history(id, &req, &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "delete": delete
    });

    Ok(HttpResponse::Ok().json(response_json))
}