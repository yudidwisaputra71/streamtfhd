use actix_web::{HttpRequest, web, HttpResponse};
use sqlx::{Pool, Postgres};
use crate::errors::AppError;
use crate::dto::settings_security_settings::SecuritySettingsData;
use serde_json::json;
use crate::view_models::settings_security_settings::verify_current_password;
use crate::view_models::settings_security_settings::update_password;

pub async fn settings_security_settings(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>,
    data: web::Json<SecuritySettingsData>
) -> Result<HttpResponse, AppError> {
    if data.current_password.is_none() {
        return Err(AppError::ValidationError(String::from("Current password is empty")));
    }

    if data.new_password.is_none() {
        return Err(AppError::ValidationError(String::from("New password is empty")));
    }

    if data.confirm_password.is_none() {
        return Err(AppError::ValidationError(String::from("Confirm password is empty")));
    }

    if data.new_password != data.confirm_password {
        return Err(AppError::ValidationError(String::from("Password doesn't match")));
    }

    let current_password = match data.current_password.clone() {
        Some(val) => val,
        None => String::from("")
    };

    if ! verify_current_password(&current_password, &req, &pool).await? {
        return Err(AppError::ValidationError(String::from("Invalid current password")));
    }

    let update = update_password(&req, pool.get_ref(), &data).await?;
    let message: String;

    if update {
        message = String::from("Password is successfully updated.");
    } else {
        message = String::from("Failed to update password.");
    }

    let response_json = json!({
        "response": true,
        "message": message
    });

    Ok(HttpResponse::Ok().json(response_json))
}