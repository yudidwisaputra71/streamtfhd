use crate::errors::AppError;
use std::fs;
use tracing::{error, debug};

pub fn clear_log(log_path: String) -> Result<bool, AppError> {
    let remove = fs::remove_file(log_path);

    match remove {
        Ok(_) => Ok(true),
        Err(err) => {
            error!("Failed to delete log file.");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    }
}