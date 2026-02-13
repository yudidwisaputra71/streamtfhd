use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, FromRow, Serialize)]
pub struct Video {
    pub id: i64,
    pub owner: String,
    pub title: String,
    pub file: String,
    pub thumbnail: String,
    pub size: i32,
    pub uploaded_at: i32
}