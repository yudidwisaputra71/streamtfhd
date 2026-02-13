use serde::Serialize;
use sqlx::prelude::FromRow;

#[derive(Debug, FromRow, Serialize)]
pub struct History {
    pub id: i64,
    pub live_stream_title: String,
    pub video_thumbnail: String,
    pub start_time: i64,
    pub end_time: i64
}