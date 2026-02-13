use serde::Serialize;
use sqlx::prelude::FromRow;

#[derive(Debug, FromRow, Serialize)]
pub struct Video {
    pub id: i64,
    pub title: String,
    pub file: String,
    pub thumbnail: String,
    pub width: i32,
    pub height: i32,
    pub length: i32
}