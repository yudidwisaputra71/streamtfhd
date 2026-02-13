use actix_web::{HttpRequest, HttpResponse, web};
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::errors::AppError;
use crate::view_models::live_stream_edit_stream_get;

pub async fn get_live_stream(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>,
    path: web::Path<i64>
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let live_stream = live_stream_edit_stream_get::get_live_stream(id, &req, &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "live_stream": live_stream
    });

    Ok(HttpResponse::Ok().json(response_json))
}