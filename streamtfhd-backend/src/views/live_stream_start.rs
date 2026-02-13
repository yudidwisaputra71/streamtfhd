use std::sync::Arc;

use actix_web::{HttpRequest, HttpResponse, web};
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::{
    errors::AppError,
    view_models::live_stream_start,
    dto::live_stream_state::LiveStreamState
};

pub async fn live_stream_start(
    req: HttpRequest,
    path: web::Path<i64>,
    pool: web::Data<Pool<Postgres>>,
    state: web::Data<Arc<LiveStreamState>>
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let start = live_stream_start::live_stream_start(id, &req, &pool.get_ref(), &state.into_inner()).await?;

    let response_json = json!({
        "response": true,
        "live_stream": start
    });

    Ok(HttpResponse::Ok().json(response_json))
}