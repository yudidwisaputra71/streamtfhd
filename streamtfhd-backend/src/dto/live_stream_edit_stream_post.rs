#[derive(serde::Deserialize)]

#[derive(Debug)]
pub struct LiveStream {
    pub id: i64,
    pub title: String,
    pub video: i64,
    pub rtmp_url: String,
    pub stream_key: String,
    pub stream_loop: i32,
    pub schedule_start: Option<i64>,
    pub schedule_end: Option<i64>
}