use serde::Serialize;

#[derive(Serialize)]
pub struct TickMessage {
    pub id: i64,
    pub schedule_start: Option<i64>,
    pub schedule_end: Option<i64>,
    pub started_at: Option<i64>,
    pub status: String
}