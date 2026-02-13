use actix_web::{web, HttpRequest, HttpResponse};
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::{
    errors::AppError,
    view_models::history
};

pub async fn get_histories(
    req: HttpRequest,
    pool:  web::Data<Pool<Postgres>>
) -> Result<HttpResponse, AppError> {
    let histories = history::get_histories(&req, &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "histories": histories
    });

    Ok(HttpResponse::Ok().json(response_json))
}