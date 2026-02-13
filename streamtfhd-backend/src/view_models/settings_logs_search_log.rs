use actix_web::HttpRequest;
use crate::errors::AppError;
use tracing::{error, debug, warn};
use std::env::var;
use crate::utils::token::{decode_token, get_jwt_from_header};

pub fn search_log(
    search_query: &String,
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
            warn!("An attemp to access search log endpoint without credentials.");

            return Err(AppError::Unauthorized);
        }
    };
    let _claims = match decode_token(&jwt, &secret_key) {
        Ok(val) => val,
        Err(_err) => {
            warn!("An attemp to access search log endpoint with invalid credentials.");

            return Err(AppError::Unauthorized);
        }
    };
    let log_path = match var("LOG_FILE") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing LOG_FILE key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };

    let res = crate::models::settings_logs_search_log::search_log(&log_path, search_query)?;

    Ok(res)
}