use tracing::{error, debug, warn};
use std::env::var;
use actix_web::HttpRequest;
use crate::utils::token::{decode_token, get_jwt_from_header};
use crate::errors::AppError;

pub fn read_log(
    last_n_lines: usize,
    req: &HttpRequest

) -> Result<Vec<String>, AppError> {
    let secret_key = match var("JWT_SECRET_KEY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing JWT_SECRET_KEY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };
    let jwt = match get_jwt_from_header(&req) {
        Some(val) => val,
        None => {
            warn!("An attemp to access get log endpoint without credentials.");

            return Err(AppError::Unauthorized);
        }
    };
    let _claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to access get log endpoint with invalid credentials.");

            return Err(AppError::Unauthorized);
        }
    };
    let log_file = match var("LOG_FILE") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing LOG_FILE key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };
    let res = crate::models::settings_logs_read_log::read_log(log_file, last_n_lines)?;

    Ok(res)
}