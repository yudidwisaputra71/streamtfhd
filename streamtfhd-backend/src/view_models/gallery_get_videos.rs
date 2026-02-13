use actix_web::HttpRequest;
use sqlx::{Pool, Postgres};
use std::env::var;
use tracing::{error, debug, warn};
use crate::utils::token::{decode_token, get_jwt_from_header};
use crate::utils::user::get_user_id_from_username;

use crate::{
    dto::gallery_get_videos::Video,
    errors::AppError,
    models::gallery_get_videos::get_videos_paginated,
    models::gallery_get_videos
};

pub async fn get_total_videos(pool: &Pool<Postgres>) -> Result<i64, AppError> {
    let count = gallery_get_videos::get_total_videos(&pool).await?;

    Ok(count)
}

pub async fn get_videos(
    req: &HttpRequest,
    pool: &Pool<Postgres>,
    page: u32,
    page_size: u32,
    order: &String
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
            warn!("An attemp to access get video endpoint without credentials 1.");

            return Err(AppError::Unauthorized);
        }
    };
    let claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to access get video endpoint with invalid credentials 2.");

            return Err(AppError::Unauthorized);
        }
    };

    let user_id = match get_user_id_from_username(claims.username, pool).await? {
        Some(val) => val,
        None => {
            warn!("An attemp to access get video endpoint with invalid credentials 3.");

            return Err(AppError::Unauthorized);
        }
    };

    let videos = get_videos_paginated(&pool, &user_id, page, page_size, &order).await?;

    Ok(videos)
}