use actix_web::{HttpResponse, web};
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::{
    errors::AppError,
    view_models::setup_account_check
};

pub async fn check(
    pool: web::Data<Pool<Postgres>>
) -> Result<HttpResponse, AppError> {
    let check = setup_account_check::check(&pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "check": check
    });
    
    Ok(HttpResponse::Ok().json(response_json))
}