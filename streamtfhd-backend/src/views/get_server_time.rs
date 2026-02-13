use actix_web::HttpResponse;
use serde_json::json;

use crate::{
    errors::AppError,
    view_models::get_server_time
};

pub async fn server_time() -> Result<HttpResponse, AppError> {
    let server_time = get_server_time::server_time();

    let response_json = json!({
        "response": true,
        "server_time": server_time
    });

    Ok(HttpResponse::Ok().json(response_json))
}