use crate::utils::token::{get_jwt_from_header, decode_token};
use crate::errors::AppError;
use actix_web::{HttpRequest};
use sqlx::{Pool, Postgres};

pub fn check_credentials(
    jwt_secret_key: String,
    req: &HttpRequest
) -> Result<bool, AppError> {
    let access_token = match get_jwt_from_header(req) {
        Some(val) => val,
        None => "".to_string()
    };

    if access_token.ne("") {
        match decode_token(&access_token, &jwt_secret_key) {
            Ok(_) => return Ok(true),
            Err(_err) => {
                return Ok(false);
            }
        };
    } else {
        return Ok(false);
    }
}

pub async fn get_user_id_from_username(
    username: String,
    pool: &Pool<Postgres>
) -> Result<Option<String>, AppError> {
    let user_id = crate::models::get_user_id_from_username::get_user_id_from_username(username, pool).await?;

    Ok(user_id)
}