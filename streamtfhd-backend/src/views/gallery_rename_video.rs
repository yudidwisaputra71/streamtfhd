use actix_web::{HttpRequest, HttpResponse, web};
use serde::Deserialize;
use sqlx::{Pool, Postgres};
use serde_json::json;
use crate::view_models::gallery_rename_video;
use crate::errors::AppError;

#[derive(Deserialize)]
pub struct Query {
    new_video_name: Option<String>,
    video_id: Option<i64>
}

pub async  fn rename_video(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>,
    query: web::Query<Query>
) -> Result<HttpResponse, AppError> {
    let video_id = match query.video_id.clone() {
        Some(val) => val,
        None => {
            return Err(AppError::BadRequest("Empty video id in URL parameter.".to_string()));
        }
    };
    let new_video_name = match query.new_video_name.clone() {
        Some(val) => val,
        None => {
            return Err(AppError::BadRequest("Empty new video name in URL parameter.".to_string()));
        }
    };
    let rename = gallery_rename_video::rename_video(video_id, &new_video_name, &req, &pool).await?;
    let message = if rename {
        "Successfully rename video."
    } else {
        "Failed to rename video."
    };

    let response_json = json!({
        "response": true,
        "rename" : rename,
        "message": message
    });

    Ok(HttpResponse::Ok().json(response_json))
}