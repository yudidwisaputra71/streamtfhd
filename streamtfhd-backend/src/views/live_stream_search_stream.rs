use actix_web::{HttpRequest, HttpResponse, web};
use serde::Deserialize;
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::{
    errors::AppError,
    view_models::live_stream_search_stream
};

#[derive(Deserialize)]
pub struct Query {
    keyword: Option<String>
}

pub async fn search_live_stream(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>,
    query: web::Query<Query>
) -> Result<HttpResponse, AppError> {
    let keyword = match query.keyword.clone() {
        Some(val) => val,
        None => {
            return Err(AppError::BadRequest("Empty search keyword in URL parameter.".to_string()));
        }
    };
    let live_streams = live_stream_search_stream::search_live_stream(&keyword, &req, &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "live_streams": live_streams
    });

    Ok(HttpResponse::Ok().json(response_json))
}