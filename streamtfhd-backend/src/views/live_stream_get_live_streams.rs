use actix_web::{HttpRequest, HttpResponse, web};
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::{
    errors::AppError,
    view_models::live_stream_get_live_streams
};

pub async fn get_live_streams(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>
) -> Result<HttpResponse, AppError> {
    let live_streams = live_stream_get_live_streams::get_live_streams(&req, &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "live_streams": live_streams
    });

    Ok(HttpResponse::Ok().json(response_json))
}