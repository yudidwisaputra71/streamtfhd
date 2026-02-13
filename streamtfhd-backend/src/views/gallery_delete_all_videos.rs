use actix_web::{HttpRequest, HttpResponse, web};
use sqlx::{Pool, Postgres};
use serde_json::json;
use crate::errors::AppError;
use crate::view_models::gallery_delete_all_videos;

pub async fn delete_all_videos(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>,
) -> Result<HttpResponse, AppError> {
    let delete = gallery_delete_all_videos::delete_all_videos(&pool.into_inner(), &req).await?;
    let message = if delete {
        "Videos was deleted."
    } else {
        "Failed to delete videos."
    };

    let response_json = json!({
        "response": true,
        "delete" : delete,
        "message": message
    });

    Ok(HttpResponse::Ok().json(response_json))
}