use std::sync::Arc;
use sqlx::{Pool, Postgres};
use std::env::var;
use tracing::{error, warn, debug};
use actix_ws::{Message, CloseReason, CloseCode};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;

use crate::{
    dto::live_stream_state::LiveStreamState,
    dto::live_stream_monitor::TickMessage,
    dto::live_stream_state::StreamStatus,
    errors::AppError,
    utils::token::decode_token,
    utils::user::get_user_id_from_username
};

#[derive(Debug, Deserialize)]
struct AuthMessage {
    msg_type: String,
    jwt: String
}

pub async fn monitor(
    req: &HttpRequest,
    body: web::Payload,
    pool: &Pool<Postgres>,
    live_stream_state: &Arc<LiveStreamState>
) -> Result<HttpResponse, AppError> {
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, body)?;
    let live_stream_state_clone = live_stream_state.clone();
    let pool_clone = pool.clone();
    
    let secret_key = match var("JWT_SECRET_KEY") {
        Ok(val) => val,
        Err(err) => {
            error!("Missing JWT_SECRET_KEY key and value in env file.");
            debug!("{}", err.to_string());

            return Err(AppError::EnvVarError(err));
        }
    };

    actix_web::rt::spawn(async move {
        let close_protocol = CloseReason {
            code: CloseCode::Protocol,
            description: Some("Invalid auth message".into()),
        };

        let close_policy = CloseReason {
            code: CloseCode::Policy,
            description: Some("Authentication failed".into()),
        };

        let _close_normal = CloseReason {
            code: CloseCode::Normal,
            description: Some("Connection closed".into()),
        };

        let close_database_error = CloseReason {
            code: CloseCode::Error,
            description: Some("Database error".into()),
        };

        let auth_msg = match msg_stream.recv().await {
            Some(Ok(Message::Text(text))) => text,
            _ => {
                let _ = session.close(Some(close_protocol)).await;
                return;
            }
        };

        // Parse auth message
        let auth: AuthMessage = match serde_json::from_str(&auth_msg) {
            Ok(v) => v,
            Err(_) => {
                warn!("An attemp to access monitor live stream endpoint with invalid auth message.");
                
                let _ = session.close(Some(close_protocol)).await;
                return;
            }
        };

        if auth.msg_type != "auth" {
            warn!("An attemp to access monitor live stream endpoint but failed in authentication.");

            let _ = session.close(Some(close_policy)).await;
            return;
        }

        let claims = match decode_token(&auth.jwt, &secret_key) {
            Ok(val) => val,
            Err(_err) => {
                warn!("An attemp to access monitor live stream endpoint with invalid credentials 1.");

                let _ = session.close(Some(close_policy)).await;
                return;
            }
        };

        let owner = match get_user_id_from_username(claims.username, &pool_clone).await {
            Ok(val) => {
                match val {
                    Some(val) => val,
                    None => {
                        warn!("An attemp to access monitor live stream endpoint with invalid credentials 2.");

                        let _ = session.close(Some(close_policy)).await;
                        return;
                    }
                }
            },
            Err(_err) => {
                error!("Failed to get user id from username.");

                let _ = session.close(Some(close_database_error)).await;
                return;
            }
        
        };

        let mut interval = tokio::time::interval(std::time::Duration::from_secs(1));

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    let mut datas: Vec<TickMessage> = Vec::new();

                    for entry in &live_stream_state_clone.jobs {
                        if entry.value().owner == owner {
                            let status_str = match entry.value().status {
                                StreamStatus::Offline => "offline",
                                StreamStatus::Scheduled => "scheduled",
                                StreamStatus::Starting => "starting",
                                StreamStatus::Live => "live",
                                StreamStatus::Done => "done",
                                StreamStatus::Stopped => "stopped",
                                StreamStatus::Cancelled => "cancelled",
                                StreamStatus::Failed(_) => "failed"
                            };
                            let data = TickMessage {
                                id: entry.value().id,
                                schedule_start: entry.value().schedule_start,
                                schedule_end: entry.value().schedule_end,
                                started_at: entry.value().actual_start,
                                status: status_str.to_string()
                            };

                            datas.push(data);
                        }
                    }

                    if session
                        .text(serde_json::to_string(&datas).unwrap())
                        .await
                        .is_err()
                    {
                        break;
                    }
                }

                msg = msg_stream.recv() => {
                    match msg {
                        Some(Ok(Message::Ping(p))) => {
                            let _ = session.pong(&p).await;
                        }
                        Some(Ok(Message::Close(_))) => {
                            break;
                        }
                        Some(Ok(_)) => {}
                        Some(Err(_)) | None => {
                            break;
                        }
                    }
                }

                else => break,
            }
        }
    });

    Ok(response)
}