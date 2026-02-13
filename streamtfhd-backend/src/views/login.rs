use actix_web::{HttpRequest, HttpResponse, web};
use crate::errors::AppError;
use sqlx::{Pool, Postgres};
use serde_json::json;
use crate::view_models::login::generate_jwt_token;

#[derive(serde::Serialize)]
#[derive(serde::Deserialize)]
pub struct LoginData {
    pub username: String,
    pub password: String,
}

pub async fn login(
    pool: web::Data<Pool<Postgres>>,
    data: web::Json<LoginData>,
    req: HttpRequest
) -> Result<HttpResponse, AppError> {
    let username = data.username.clone();
    let login = crate::view_models::login::login(pool.get_ref(), data.into_inner(), &req).await?;
    let jwt = generate_jwt_token(username)?;
    let data = json!({
        "jwt": jwt
    });

    Ok(HttpResponse::Ok().json(
        json!({
            "response": true,
            "login": login,
            "data": data
        })
    ))
}