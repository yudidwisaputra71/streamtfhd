use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{0}")]
    BadRequest(String),

    #[error("{0}")]
    ValidationError(String),

    #[error("Resource not found")]
    NotFound,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("{0}")]
    InternalError(String),

    #[error("{0}")]
    Conflict(String),

    #[error("Unprocessable Entity")]
    UnprocessableEntity,

    #[error("Database error")]
    Database(#[from] sqlx::Error),

    #[error("Database migration error")]
    DatabaseMigration(#[from] sqlx::migrate::MigrateError),

    #[error("IO error")]
    IO(#[from] std::io::Error),

    #[error("Failed to hash password")]
    HashPasswordFailed,

    #[error("Username is empty")]
    EmptyUsername,

    #[error("Password is empty")]
    EmptyPassword,

    #[error("Repeat password is empty")]
    EmptyRepeatPassword,

    #[error("Confirm password")]
    ConfirmPassword,

    #[error("Password doesn't match")]
    PasswordDoesntMatch,

    #[error("Multipart error")]
    MultipartError(#[from] actix_multipart::MultipartError),

    #[error("Invalid username and password combination")]
    LoginFailed,

    #[error("Failed to hash password")]
    PasswordHashFailed(#[from] argon2::password_hash::Error),

    #[error("JWT error")]
    JWTError(#[from] jsonwebtoken::errors::Error),

    #[error("Env var error")]
    EnvVarError(#[from] std::env::VarError),

    #[error("Actix web error")]
    ActixWebError(#[from] actix_web::Error),

    #[error("Forbidden")]
    Forbidden,

    #[error("Reqwest error")]
    ReqwestError(#[from] reqwest::Error),

    #[error("{0}")]
    NotAVideoFile(String),

    #[error("Failed to detect mime file name and mime type")]
    DetectFileNameAndMimeTypeError,

    #[error("Failed to parse value to integer")]
    ParseIntError,

    #[error("Failed to parse value to float")]
    ParseFloatError,

    #[error("Live stream failed")]
    LiveStreamFailed,

    #[error("Live stream already live")]
    LiveStreamAlreadyLive,

    #[error("Live stream already scheduled")]
    LiveStreamAlreadyScheduled,

    #[error("Live stream conflict")]
    LiveStreamConflict,
}

impl ResponseError for AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::ValidationError(_) => StatusCode::UNPROCESSABLE_ENTITY,
            AppError::Unauthorized => StatusCode::UNAUTHORIZED,
            AppError::NotFound => StatusCode::NOT_FOUND,
            AppError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::DatabaseMigration(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::IO(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::InternalError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Conflict(_) => StatusCode::CONFLICT,
            AppError::UnprocessableEntity => StatusCode::UNPROCESSABLE_ENTITY,
            AppError::HashPasswordFailed => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::EmptyUsername => StatusCode::BAD_REQUEST,
            AppError::EmptyPassword => StatusCode::BAD_REQUEST,
            AppError::EmptyRepeatPassword => StatusCode::BAD_REQUEST,
            AppError::ConfirmPassword => StatusCode::BAD_REQUEST,
            AppError::PasswordDoesntMatch => StatusCode::BAD_REQUEST,
            AppError::MultipartError(_) => StatusCode::BAD_REQUEST,
            AppError::LoginFailed => StatusCode::UNAUTHORIZED,
            AppError::PasswordHashFailed(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::JWTError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::EnvVarError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::ActixWebError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Forbidden => StatusCode::FORBIDDEN,
            AppError::ReqwestError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::NotAVideoFile(_) => StatusCode::BAD_REQUEST,
            AppError::DetectFileNameAndMimeTypeError => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::ParseIntError => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::ParseFloatError => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::LiveStreamFailed => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::LiveStreamAlreadyLive => StatusCode::CONFLICT,
            AppError::LiveStreamAlreadyScheduled => StatusCode::CONFLICT,
            AppError::LiveStreamConflict => StatusCode::CONFLICT
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({
            "error": self.to_string()
        }))
    }
}