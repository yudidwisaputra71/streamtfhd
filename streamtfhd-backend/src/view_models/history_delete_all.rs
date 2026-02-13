use actix_web::HttpRequest;
use sqlx::{Pool, Postgres};
use std::env::var;
use tracing::{error, debug, warn};

use crate::{
    errors::AppError,
    utils::token::{decode_token, get_jwt_from_header},
    utils::user::get_user_id_from_username,
    models::history_delete_all
};

pub async fn delete_all(
    req: &HttpRequest,
    pool: &Pool<Postgres>
) -> Result<bool, AppError> {
    let secret_key = match var("JWT_SECRET_KEY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing JWT_SECRET_KEY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };
    let jwt = match get_jwt_from_header(&req) {
        Some(val) => val,
        None => {
            warn!("An attemp to access delete all live stream history endpoint without credentials 1.");

            return Err(AppError::Unauthorized);
        }
    };
    let claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to access delete all live stream history endpoint with invalid credentials 2.");

            return Err(AppError::Unauthorized);
        }
    };
    let user_id = match get_user_id_from_username(claims.username, pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to access delete all live stream history endpoint with invalid credentials 3.");

            return Err(AppError::Unauthorized);
        }
    };

    let delete_all = history_delete_all::delete_all(&user_id, &pool).await?;

    Ok(delete_all)
}