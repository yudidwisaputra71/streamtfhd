use std::time::{Duration, SystemTime};

pub fn current_unix_timestamp() -> u64 {
    let ret = match std::time::SystemTime::now().duration_since(std::time::SystemTime::UNIX_EPOCH) {
        Ok(n) => n.as_secs(),
        Err(_) => 0
    };

    return ret;
}

pub fn unix_to_system_time(ts: u64) -> SystemTime {
    SystemTime::UNIX_EPOCH + Duration::from_secs(ts)
}