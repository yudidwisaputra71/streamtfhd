use crate::utils::time::current_unix_timestamp;

pub fn server_time() -> u64 {
    current_unix_timestamp()
}