use sqlx::prelude::FromRow;

#[derive(Debug, FromRow, serde::Serialize)]
pub struct Video {
    pub id: i64,
    pub title: String,
    pub file: String,
    pub thumbnail: String,
}

#[derive(serde::Serialize)]
pub struct LiveStream {
    pub id: i64,
    pub title: String,
    pub video: Option<Video>,
    pub rtmp_url: String,
    pub stream_key: String,
    pub stream_loop: i32,
    pub schedule_start: Option<i64>,
    pub schedule_end: Option<i64>
}