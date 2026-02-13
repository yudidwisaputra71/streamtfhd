use actix_web::{HttpRequest, HttpResponse, web};
use sqlx::{Pool, Postgres};
use crate::errors::AppError;
use crate::view_models::gallery_get_videos;
use serde_json::json;

pub async fn get_videos(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>,
    path: web::Path<(u32, u32, String)>,
) -> Result<HttpResponse, AppError> {
    let pool = pool.into_inner();
    let (page, page_size, order) = path.into_inner();
    let videos = gallery_get_videos::get_videos(&req, &pool.clone(), page, page_size, &order).await?;
    let count = gallery_get_videos::get_total_videos(&pool).await?;

    let data = json!({
        "videos": videos,
        "page": page,
        "page_size": page_size,
        "total_videos": count
    });

    let response_json = json!({
        "response": true,
        "data": data
    });

    Ok(HttpResponse::Ok().json(response_json))
}