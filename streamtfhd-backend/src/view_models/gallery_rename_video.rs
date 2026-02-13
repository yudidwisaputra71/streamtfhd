use actix_web::HttpRequest;
use sqlx::{Pool, Postgres};
use crate::errors::AppError;
use tracing::{error, debug, warn};
use std::env::var;
use crate::utils::token::{get_jwt_from_header, decode_token};
use crate::utils::user::get_user_id_from_username;
use crate::models::gallery_rename_video;

pub async fn rename_video(
    video_id: i64,
    new_video_name: &String,
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
            warn!("An attemp to access rename video endpoint without credentials 1.");

            return Err(AppError::Unauthorized);
        }
    };
    let claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to access rename video endpoint with invalid credentials 2.");

            return Err(AppError::Unauthorized);
        }
    };
    let user_id = match get_user_id_from_username(claims.username, pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to access rename video endpoint with invalid credentials 3.");

            return Err(AppError::Unauthorized);
        }
    };
    let video_owner = gallery_rename_video::get_video_owner(video_id, &pool).await?;
    let video_onwer_string = match video_owner {
        Some(val) => val,
        None => {
            warn!("An attemp to access rename video with invalid credentials.");

            return Err(AppError::Forbidden);
        }
    };

    if  video_onwer_string.ne(&user_id) {
        return Err(AppError::Forbidden);
    }

    let res = gallery_rename_video::rename_video(&video_id, &new_video_name, &pool).await?;

    Ok(res)
}