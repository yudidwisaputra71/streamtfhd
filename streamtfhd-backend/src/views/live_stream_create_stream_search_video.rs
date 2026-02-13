use actix_web::{HttpRequest, web, HttpResponse};
use serde::Deserialize;
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::{
    view_models::live_stream_create_stream_search_video,
    errors::AppError
};

#[derive(Deserialize)]
pub struct Query {
    keyword: Option<String>
}

pub async fn search_video(
    req: HttpRequest,
    pool:  web::Data<Pool<Postgres>>,
    query: web::Query<Query>
) -> Result<HttpResponse, AppError> {
    let keyword = match query.keyword.clone() {
        Some(val) => val,
        None => {
            return Err(AppError::BadRequest("Empty search keyword in URL parameter.".to_string()));
        }
    };
    let result = live_stream_create_stream_search_video::search_video(&keyword, &req, &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "data": result
    });

    Ok(HttpResponse::Ok().json(response_json))
}