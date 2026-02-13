use sqlx::{PgPool, Pool, Postgres};
use tracing::{error, debug};
use crate::errors::AppError;

pub async fn pool(
    user: String,
    password: String,
    host: String,
    database_name: String
) -> Result<Pool<Postgres>, AppError> {
    let url = format!("postgres://{}:{}@{}/{}", user, password, host, database_name);
    let pool = PgPool::connect(&url).await;

    if let Err(ref e) = pool {
        error!("Failed to create database pool.");
        debug!("{}.", e.to_string());
    }

    let ret = pool?;

    Ok(ret)
}

pub async fn migrate(pool: &Pool<Postgres>) -> Result<(), AppError> {
    let migrate = sqlx::migrate!()
                        .run(pool)
                        .await;
    
    if let Err(ref e) = migrate {
        error!("Failed to migrate database.");
        debug!("{}", e.to_string());
    }

    let migration = migrate?;

    Ok(migration)
}