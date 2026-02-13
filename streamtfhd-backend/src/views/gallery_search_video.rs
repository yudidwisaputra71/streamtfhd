use actix_web::{HttpRequest, HttpResponse, web};
use serde::Deserialize;
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::errors::AppError;
use crate::view_models::gallery_search_video;

#[derive(Deserialize)]
pub struct Query {
    keyword: Option<String>
}

pub async fn search_video(
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
    let data = gallery_search_video::search_video(&keyword, &req, &pool.into_inner()).await?;

    let response_json = json!({
        "response": true,
        "data": data
    });

    Ok(HttpResponse::Ok().json(response_json))
}