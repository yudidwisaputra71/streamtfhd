use actix_web::HttpRequest;
use jsonwebtoken::{encode, decode, Header, EncodingKey, Algorithm, Validation, DecodingKey};
use tracing::{error, debug};
use crate::errors::AppError;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
   pub username: String,
   pub exp: u64
}

pub fn get_jwt_from_header(
    req: &HttpRequest
) -> Option<String> {
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                return Some(token.to_owned());
            }
        }
    }

    None
}

pub fn encode_token(
    claims: &Claims,
    secret_key: &String
) -> Result<String, AppError> {
    let tok = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(
            secret_key.as_bytes()
        )
    );

    match tok {
        Ok(val) => {
            return Ok(val);
        },
        Err(err) => {
            error!("Failed to encode toke.");
            debug!("{}", err.to_string());

            return Err(AppError::JWTError(err));
        }
    }
}

pub fn decode_token(
    token: &String,
    secret_key: &String
) -> Result<Claims, AppError> {
    let token_message = decode::<Claims>(
        &token,
        &DecodingKey::from_secret(secret_key.as_bytes()),
        &Validation::new(Algorithm::HS256)
    );

    let claims = match token_message {
        Ok(ok) => ok.claims,
        Err(err) => {
            error!("Error decoding token.");
            debug!("{:?}", err);

            return Err(AppError::JWTError(err))
        }
    };

    Ok(claims)
}