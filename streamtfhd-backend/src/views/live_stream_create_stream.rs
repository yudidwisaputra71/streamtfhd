use actix_web::{web, HttpResponse, HttpRequest};
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::{
    dto::live_stream_create_stream::CreateLiveStreamData,
    errors::AppError,
    view_models::live_stream_create_stream
};

pub async fn create_live_stream(
    req: HttpRequest,
    data: web::Json<CreateLiveStreamData>,
    pool:  web::Data<Pool<Postgres>>
) -> Result<HttpResponse, AppError> {
    let create = live_stream_create_stream::create_live_stream(&req, &data.into_inner(), &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "create": create
    });

    Ok(HttpResponse::Ok().json(response_json))
}
