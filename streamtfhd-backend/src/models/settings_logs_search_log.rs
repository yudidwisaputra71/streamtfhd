use crate::errors::AppError;
use std::path::Path;
use std::fs::OpenOptions;
use std::io::{BufRead, BufReader};
use tracing::{error, debug};

pub fn search_log<P: AsRef<Path>>(
    log_path: &P,
    search_query: &String
) -> Result<Vec<String>, AppError> {
    let file = match OpenOptions::new()
                                            .read(true)
                                            .write(true)
                                            .create(true)
                                            .open(log_path) {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to open log file.");
            debug!("{}", err.to_string());

            return Err(AppError::IO(err));
        }
    };
    let reader = BufReader::new(file);
    let mut buffer: Vec<String> = Vec::new();

    for line in reader.lines() {
        let line = line?;

        if line.to_lowercase().contains(&search_query.to_lowercase()) {
            buffer.push(line);
        }
    }

    Ok(buffer.into_iter().collect())
}