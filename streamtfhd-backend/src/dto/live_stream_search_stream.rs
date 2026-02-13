use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Serialize, FromRow)]
pub struct LiveStream {
    pub live_stream_id: i64,
    pub live_stream_title: String,
    pub live_stream_schedule_start: Option<i64>,
    pub live_stream_schedule_end: Option<i64>,
    pub live_stream_started_at: Option<i64>,
    pub video_id: i64,
    pub video_thumbnail: String,
    pub video_width: i32,
    pub video_height: i32,
    pub video_bit_rate: i32,
    pub video_frame_rate: i32
}