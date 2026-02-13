use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, FromRow, Serialize)]
pub struct Profile {
    pub avatar: Option<String>,
    pub username: String,
}