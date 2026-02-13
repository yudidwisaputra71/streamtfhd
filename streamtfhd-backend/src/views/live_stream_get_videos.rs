use actix_web::{web, HttpRequest, HttpResponse};
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::{
    errors::AppError,
    view_models::live_stream_get_videos
};

pub async fn get_videos(
    req: HttpRequest,
    pool:  web::Data<Pool<Postgres>>
) -> Result<HttpResponse, AppError> {
    let videos = live_stream_get_videos::get_videos(&req, &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "data": videos
    });

    Ok(HttpResponse::Ok().json(response_json))
}