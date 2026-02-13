use actix_web::HttpRequest;
use sqlx::{Pool, Postgres};
use tracing::{error, debug, warn};
use std::env::var;

use crate::{
    dto::live_stream_edit_stream_get::LiveStream,
    errors::AppError,
    utils::token::{decode_token, get_jwt_from_header},
    utils::user::get_user_id_from_username,
    models::live_stream_edit_stream_get
};

pub async fn get_live_stream(
    id: i64,
    req: &HttpRequest,
    pool: &Pool<Postgres>
) -> Result<Option<LiveStream>, AppError> {
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
            warn!("An attemp to access get livestreams endpoint without credentials 1.");

            return Err(AppError::Unauthorized);
        }
    };
    let claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to access get livestreams endpoint with invalid credentials 2.");

            return Err(AppError::Unauthorized);
        }
    };
    let user_id = match get_user_id_from_username(claims.username, pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to access get livestreams endpoint with invalid credentials 3.");

            return Err(AppError::Unauthorized);
        }
    };
    let live_stream_owner = match live_stream_edit_stream_get::get_live_stream_owner(id, &pool).await? {
        Some(val) => val,
        None => {
            String::from("")
        }
    };

    if user_id.ne(&live_stream_owner) {
        warn!("An attemp to get a specific live stream that not owned by him/her.");

        return Err(AppError::Forbidden);
    }

    let live_stream = live_stream_edit_stream_get::get_live_stream(id, &pool).await?;

    Ok(live_stream)
}