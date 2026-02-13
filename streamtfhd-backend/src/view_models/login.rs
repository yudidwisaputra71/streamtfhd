use actix_web::HttpRequest;
use sqlx::{Pool, Postgres};
use crate::errors::AppError;
use crate::views::login::LoginData;
use std::env::var;
use tracing::{error, debug, warn, info};

pub fn generate_jwt_token(username: String) -> Result<String, AppError> {
    let secret_key = match var("JWT_SECRET_KEY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing JWT_SECRET_KEY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };
    let now = crate::utils::time::current_unix_timestamp();

    let claims = crate::utils::token::Claims {
        username: username,
        exp: now + 31556952
    };

    let jwt_token = crate::utils::token::encode_token(&claims, &secret_key)?;

    Ok(jwt_token)
}

pub async fn login(
    pool: &Pool<Postgres>,
    data: LoginData,
    req: &HttpRequest
) -> Result<bool, AppError> {
    let username = data.username.clone();
    let ip_address = req.connection_info()
        .realip_remote_addr()
        .unwrap_or("unknown")
        .to_string();
    let login = crate::models::login::login(&pool, data, &ip_address).await?;

    if !login {
        warn!("An attemp to login from \"{}\" using \"{}\" user but failed.", ip_address, username);

        return Err(AppError::LoginFailed);    
    } else {
        info!("User \"{}\" logged in from \"{}\".", username, ip_address);
    }
    
    Ok(login)
}