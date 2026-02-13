use actix_web::HttpRequest;
use sqlx::{Pool, Postgres};
use tracing::{error, debug, warn};
use std::env::var;

use crate::{
    dto::live_stream_create_stream_search_video::Video,
    errors::AppError,
    utils::token::get_jwt_from_header,
    utils::token::decode_token,
    utils::user::get_user_id_from_username,
    models::live_stream_create_stream_search_video
};

pub async fn search_video (
    keyword: &String,
    req: &HttpRequest,
    pool: &Pool<Postgres>
) -> Result<Vec<Video>, AppError> {
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
            warn!("An attemp to access create livestream endpoint without credentials 1.");

            return Err(AppError::Unauthorized);
        }
    };
    let claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to access create livestream endpoint with invalid credentials 2.");

            return Err(AppError::Unauthorized);
        }
    };
    let user_id = match get_user_id_from_username(claims.username, &pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to access create livestream endpoint with invalid credentials 3.");

            return Err(AppError::Unauthorized);
        }
    };

    let search_result = live_stream_create_stream_search_video::search_video(&user_id, &keyword, &pool).await?;

    Ok(search_result)
}