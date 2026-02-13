use actix_web::{web, HttpResponse, HttpRequest};
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::{
    dto::live_stream_edit_stream_post::LiveStream,
    errors::AppError,
    view_models::live_stream_edit_stream_post
};

pub async fn update_live_stream_data(
    req: HttpRequest,
    data: web::Json<LiveStream>,
    pool:  web::Data<Pool<Postgres>>
) -> Result<HttpResponse, AppError> {
    let update = live_stream_edit_stream_post::update_live_stream_data(&data.into_inner(), &req, &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "update": update
    });

    Ok(HttpResponse::Ok().json(response_json))
}