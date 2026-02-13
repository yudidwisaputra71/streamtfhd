use actix_web::{HttpRequest, HttpResponse, web};
use tokio::sync::broadcast;
use crate::models::websocket_dashboard_metrics::Metrics;
use crate::errors::AppError;

pub async fn websocket_dashboard_metrics(
    req: HttpRequest,
    body: web::Payload,
    tx: web::Data<broadcast::Sender<Metrics>>,
) -> Result<HttpResponse, AppError> {
    let response = crate::view_models::websocket_dashboard_metrics::websocket_dashboard_metrics(req, body, tx).await?;

    Ok(response)
}