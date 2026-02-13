use std::collections::VecDeque;
use std::fs::OpenOptions;
use std::io::{BufRead, BufReader};
use std::path::Path;
use crate::errors::AppError;
use tracing::{error, debug};

pub fn read_log<P: AsRef<Path>>(
    path: P,
    last_n_lines: usize,
) -> Result<Vec<String>, AppError> {
    let file = match OpenOptions::new()
                                            .read(true)
                                            .write(true)
                                            .create(true)
                                            .open(path) {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to open log file.");
            debug!("{}", err.to_string());

            return Err(AppError::IO(err));
        }
    };
    let reader = BufReader::new(file);

    let mut buffer: VecDeque<String> = VecDeque::with_capacity(last_n_lines);

    for line in reader.lines() {
        let line = line?;

        if buffer.len() == last_n_lines {
            buffer.pop_front();
        }

        buffer.push_back(line);
    }

    Ok(buffer.into_iter().collect())
}