use actix_web::{HttpRequest, HttpResponse, web};
use actix_ws::Message;
use futures_util::StreamExt;
use tokio::sync::broadcast;
use serde_json::to_string;
use crate::models::websocket_dashboard_metrics::Metrics;
use crate::errors::AppError;

pub async fn websocket_dashboard_metrics(
    req: HttpRequest,
    body: web::Payload,
    tx: web::Data<broadcast::Sender<Metrics>>,
) -> Result<HttpResponse, AppError> {
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, body)?;

    let mut rx = tx.subscribe();

    // ✅ SINGLE task owns `session`
    actix_web::rt::spawn(async move {
        loop {
            tokio::select! {
                // Send metrics → client
                result = rx.recv() => {
                    match result {
                        Ok(metrics) => {
                            let json = to_string(&metrics).unwrap();
                            if session.text(json).await.is_err() {
                                break;
                            }
                        }
                        Err(_) => break,
                    }
                }

                // Receive messages ← client
                msg = msg_stream.next() => {
                    match msg {
                        Some(Ok(Message::Ping(bytes))) => {
                            let _ = session.pong(&bytes).await;
                        }
                        Some(Ok(Message::Close(_))) => break,
                        Some(Ok(_)) => {}
                        _ => break,
                    }
                }
            }
        }
    });

    Ok(response)
}