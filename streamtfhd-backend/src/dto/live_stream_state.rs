use dashmap::DashMap;
use tokio::{process::Child, sync::Notify};
use std::sync::Arc;

#[derive(Debug, Clone, serde::Serialize)]
pub enum StreamStatus {
    Offline,
    Scheduled,
    Starting,
    Live,
    Done,
    Stopped,
    Cancelled,
    Failed(String),
}

pub struct StreamJob {
    pub id: i64,
    pub owner: String,
    pub schedule_start: Option<i64>,
    pub schedule_end: Option<i64>,
    pub actual_start: Option<i64>,
    pub actual_stop: Option<i64>,
    pub status: StreamStatus,
    pub child: Option<Child>,
    pub cancel_notify: Arc<Notify>,
    pub is_finalized: bool
}

pub struct LiveStreamState {
    pub jobs: DashMap<i64, StreamJob>
}