use std::sync::Arc;
use actix_web::HttpRequest;
use sqlx::{Pool, Postgres};
use tracing::{error, warn, info, debug};
use std::env::var;

use crate::{
    dto::live_stream_state::{LiveStreamState, StreamStatus},
    errors::AppError,
    utils::token::{decode_token, get_jwt_from_header},
    utils::user::get_user_id_from_username,
    utils::live_stream::stop_stream_internal,
    models::live_stream_cancel::get_live_stream_owner
};

pub async fn cancel_stream(
    id: i64,
    req: &HttpRequest,
    state: &Arc<LiveStreamState>,
    pool: &Pool<Postgres>
) -> Result<i64, AppError> {
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
            warn!("An attemp to access cancel live stream endpoint without credentials 1.");

            return Err(AppError::Unauthorized);
        }
    };
    let claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to access cancel live stream endpoint with invalid credentials 2.");

            return Err(AppError::Unauthorized);
        }
    };
    let user_id = match get_user_id_from_username(claims.username, pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to access cancel live stream endpoint with invalid credentials 3.");

            return Err(AppError::Unauthorized);
        }
    };

    let stream_owner = get_live_stream_owner(id, &pool).await?;

    match stream_owner {
        Some(val) => {
            if val.ne(&user_id) {
                warn!("An attemp to cancel live stream schedule that not owned by her/him.");

                return Err(AppError::Forbidden);
            }
        }
        None => {
            return Err(AppError::BadRequest("Invalid stream ID".to_string()));
        }
    }

    info!("Cancelling live stream schedule with id {}.", id);

    stop_stream_internal(&state, id, StreamStatus::Cancelled, &pool).await;
    
    Ok(id)
}