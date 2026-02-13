use actix_web::{HttpRequest, HttpResponse, web};
use serde::Deserialize;
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::{
    errors::AppError,
    view_models::history_search
};

#[derive(Deserialize)]
pub struct Query {
    keyword: Option<String>
}

pub async fn search_history(
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
    let result = history_search::search_history(&keyword, &req, &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "result": result
    });

    Ok(HttpResponse::Ok().json(response_json))
}