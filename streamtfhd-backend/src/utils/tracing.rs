use std::fs::OpenOptions;
use tracing_subscriber::{fmt, EnvFilter};
use std::env::var;
use std::process;

pub fn init() {
    let log_file = match var("LOG_FILE") {
        Ok(val) => val,
        Err(_err) => {
            eprintln!("Missing LOG_FILE key and value in env file.");

            process::exit(121);
        }
    };
    let file_result = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_file);
    let file = match file_result {
        Ok(val) => val,
        Err(err) => {
            eprintln!("Failed to open log file.");
            eprintln!("{}", err.to_string());

            process::exit(122);
        }
    };

    fmt()
        .with_writer(file)
        .with_target(false)
        .with_ansi(true)
        .with_env_filter(EnvFilter::from_default_env())
        .with_timer(fmt::time::ChronoLocal::rfc_3339())
        .init();
}