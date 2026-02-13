use actix_web::{HttpRequest, HttpResponse, web};
use sqlx::{Pool, Postgres};
use serde_json::json;

use crate::{errors::AppError, view_models::gallery_delete_video};

pub async fn delete_video(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>,
    path: web::Path<i64>
) -> Result<HttpResponse, AppError> {
    let video_id = path.into_inner();
    let delete_video = gallery_delete_video::delete_video(video_id, &pool.into_inner(), &req).await?;
    let message = if delete_video {
        "The video was deleted."
    } else {
        "Failed to delete video."
    };

    let response_json = json!({
        "response": true,
        "delete" : delete_video,
        "message": message
    });

    Ok(HttpResponse::Ok().json(response_json))
}