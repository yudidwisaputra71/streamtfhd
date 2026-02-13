use sqlx::{FromRow, Type};

#[derive(Debug, FromRow, Clone, Type)]
pub struct LiveStreamData {
    pub id: i64,
    pub owner: String,
    pub video_file: String,
    pub rtmp_url: String,
    pub stream_key: String,
    pub stream_loop: i32,
    pub schedule_start: Option<i64>,
    pub schedule_end: Option<i64>,
}