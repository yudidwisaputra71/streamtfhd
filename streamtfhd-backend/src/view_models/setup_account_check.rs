use sqlx::{Pool, Postgres};

use crate::{
    errors::AppError,
    models::setup_account_check
};

pub async fn check(pool: &Pool<Postgres>) -> Result<bool, AppError> {
    Ok(setup_account_check::check(&pool).await?)
}