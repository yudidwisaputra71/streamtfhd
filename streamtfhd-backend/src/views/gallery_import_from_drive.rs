use actix_web::{HttpRequest, HttpResponse, web};
use serde::Deserialize;
use sqlx::{Pool, Postgres};
use serde_json::json;
use urlencoding::decode;
use tracing::{error, debug};

use crate::errors::AppError;
use crate::view_models::gallery_import_from_drive;

#[derive(Deserialize)]
pub struct Query {
    google_drive_url: Option<String>
}

pub async fn import_from_drive(
    req: HttpRequest,
    pool: web::Data<Pool<Postgres>>,
    query: web::Query<Query>
) -> Result<HttpResponse, AppError> {
    let google_drive_url = match query.google_drive_url.clone() {
        Some(val) => val,
        None => {
            return Err(AppError::BadRequest("Empty Google Drive URL in URL parameter.".to_string()));
        }
    };
    let google_drive_url_decoded = match decode(&google_drive_url) {
        Ok(val) => val.into_owned(),
        Err(err) => {
            error!("Failed to decode decoded url parameter.");
            debug!("{}", err);

            return Err(AppError::InternalError(String::from("Failed to decode decoded url parameter")));
        }
    };
    let import = gallery_import_from_drive::import_from_drive(&google_drive_url_decoded, &req, &pool).await?;

    let response_json = json!({
        "response": true,
        "import": import
    });

    Ok(HttpResponse::Ok().json(response_json))
}