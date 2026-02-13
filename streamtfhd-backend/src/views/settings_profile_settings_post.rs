use actix_web::{web, HttpResponse, HttpRequest};
use crate::errors::AppError;
use sqlx::{Pool, Postgres};
use crate::dto::settings_profile_settings_post::ProfileSettingsData;
use crate::view_models::settings_profile_settings_post::update_user;
use serde_json::json;

pub async fn settings_profile_settings_post(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>,
    data: web::Json<ProfileSettingsData>
) -> Result<HttpResponse, AppError> {
    let dat = data.into_inner();

    if dat.username.is_none() {
        return Err(AppError::ValidationError("Username is empty".to_string()));
    }

    let update = update_user(&req, pool.get_ref(), &dat).await?;
    let message = if update {
        String::from("Data updated successfully.")
    } else {
        String::from("Failed to update data")
    };

    let response_json = json!({
        "response": update,
        "message": message
    });

    Ok(HttpResponse::Ok().json(response_json))
}