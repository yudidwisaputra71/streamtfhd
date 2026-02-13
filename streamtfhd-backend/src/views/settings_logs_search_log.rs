use actix_web::{web, HttpRequest, HttpResponse};
use crate::errors::AppError;
use serde_json::json;
use serde::Deserialize;
use urlencoding::decode;
use tracing::{error, debug};

#[derive(Deserialize)]
pub struct SearchQuery {
    pub query: Option<String>,
}

pub async fn search_log(
    params: web::Query<SearchQuery>,
    req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let search_query = match params.query.clone() {
        Some(val) => val,
        None => {
            return Err(AppError::BadRequest(String::from("Missing search query parameter")));
        }
    };
    let search_query_decoded = match decode(&search_query) {
        Ok(val) => val.into_owned(),
        Err(err) => {
            error!("Failed to decode decoded url parameter.");
            debug!("{}", err);

            return Err(AppError::InternalError(String::from("Failed to decode decoded url parameter")));
        }
    };
    let log = crate::view_models::settings_logs_search_log::search_log(&search_query_decoded, &req)?;

    let response_json = json!({
        "response": true,
        "data": log
    });

    Ok(HttpResponse::Ok().json(response_json))
}