use std::sync::Arc;
use actix_web::{HttpRequest, HttpResponse, web};
use serde_json::json;
use sqlx::{Pool, Postgres};

use crate::{
    dto::live_stream_state::LiveStreamState,
    errors::AppError,
    view_models::live_stream_cancel
};

pub async fn cancel_stream(
    path: web::Path<i64>,
    req: HttpRequest,
    state: web::Data<Arc<LiveStreamState>>,
    pool: web::Data<Pool<Postgres>>
) -> Result<HttpResponse, AppError> {
    let stop = live_stream_cancel::cancel_stream(path.into_inner(), &req, &state.into_inner(), &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "cancelled_live_stream_id": stop
    });

    Ok(HttpResponse::Ok().json(response_json))
}