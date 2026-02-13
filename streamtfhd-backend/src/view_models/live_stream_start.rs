use std::sync::Arc;
use actix_web::HttpRequest;
use sqlx::{Pool, Postgres};
use tracing::{error, debug, warn};
use std::env::var;

use crate::{
    dto::live_stream_state::LiveStreamState,
    errors::AppError,
    utils::live_stream::start_stream,
    models::live_stream_start::get_live_stream_data,
    utils::token::{decode_token, get_jwt_from_header},
    utils::user::get_user_id_from_username,
};

pub async fn live_stream_start(
    id: i64,
    req: &HttpRequest,
    pool: &Pool<Postgres>,
    state: &Arc<LiveStreamState>
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
            warn!("An attemp to access start live stream endpoint without credentials 1.");

            return Err(AppError::Unauthorized);
        }
    };
    let claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to access start live stream endpoint with invalid credentials 2.");

            return Err(AppError::Unauthorized);
        }
    };
    let user_id = match get_user_id_from_username(claims.username, pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to access start live stream endpoint with invalid credentials 3.");

            return Err(AppError::Unauthorized);
        }
    };

    let live_stream_data = match get_live_stream_data(id, &pool).await? {
        Some(val) => val,
        None => {
            return Err(AppError::BadRequest("Invalid live stream ID".to_string()));
        }
    };

    if live_stream_data.owner.ne(&user_id) {
        warn!("An attemp to cancel live stream schedule that not owned by her/him.");

        return Err(AppError::Forbidden);
    }

    let start = start_stream(&live_stream_data, &state, &pool).await?;
    
    Ok(start)
}