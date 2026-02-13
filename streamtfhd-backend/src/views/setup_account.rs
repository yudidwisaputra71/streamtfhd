use actix_web::{web, HttpResponse};
use crate::errors::AppError;
use serde::Deserialize;
use sqlx::{Pool, Postgres};
use serde_json::json;

#[derive(Deserialize)]
pub struct SetupAccount {
    pub avatar: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub repeat_password: Option<String>
}

pub struct AddUser {
    pub avatar: Option<String>,
    pub username: String,
    pub password: String,
}

pub async fn setup_account(
    pool: web::Data<Pool<Postgres>>,
    data: web::Json<SetupAccount>
) -> Result<HttpResponse, AppError> {
    let username = match data.username.clone() {
        Some(val) => val,
        None => {
            "".to_string()
        }
    };

    let password = match data.password.clone() {
        Some(val) => val,
        None => {
            "".to_string()
        }
    };

    let repeat_password = match data.repeat_password.clone() {
        Some(val) => val,
        None => {
            "".to_string()
        }
    };

    if username.eq("") {
        return Err(AppError::EmptyUsername);
    } else if password.eq("") {
        return Err(AppError::EmptyPassword);
    } else if repeat_password.eq("") {
        return Err(AppError::EmptyRepeatPassword);
    } else if password.ne(&repeat_password) {
        return Err(AppError::PasswordDoesntMatch);
    }

    if data.username.is_none() {
        return Err(AppError::EmptyUsername);
    } else if data.password.is_none() {
        return Err(AppError::EmptyPassword);
    } else if data.repeat_password.is_none() {
        return Err(AppError::ConfirmPassword);
    }

    let user_data = AddUser {
        avatar: data.avatar.clone(),
        username: username,
        password: password
    };

    let add_user = match crate::view_models::setup_account::add_user(&pool.into_inner(), user_data).await {
        Ok(val) => val,
        Err(err) => {
            return Err(err);
        }
    };

    Ok(HttpResponse::Ok().json(
        json!({
            "response": add_user,
            "message": "User created",
        })
    ))
}