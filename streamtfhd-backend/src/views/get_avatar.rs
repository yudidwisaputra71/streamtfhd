use actix_web::{HttpRequest, HttpResponse, web};
use crate::errors::AppError;
use serde_json::json;
use crate::view_models::get_avatar;
use sqlx::{Pool, Postgres};

pub async fn get_avatar(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>
) -> Result<HttpResponse, AppError> {
    let avatar = get_avatar::get_avatar(&req, &pool.get_ref()).await?;

    let response_json = json!({
        "response": true,
        "avatar": avatar
    });

    Ok(HttpResponse::Ok().json(response_json))
}