use std::sync::Arc;

use actix_web::{web, HttpRequest, HttpResponse};
use sqlx::{Pool, Postgres};

use crate::{
    dto::live_stream_state::LiveStreamState, errors::AppError, view_models::live_stream_monitor
};

pub async fn monitor(
    req: HttpRequest,
    body: web::Payload,
    pool: web::Data<Pool<Postgres>>,
    live_stream_state: web::Data<Arc<LiveStreamState>>
) -> Result<HttpResponse, AppError> {
    let ret = live_stream_monitor::monitor(&req, body, &pool, &live_stream_state.get_ref()).await?;

    Ok(ret)
}