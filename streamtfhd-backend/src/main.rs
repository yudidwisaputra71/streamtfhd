pub mod views;
pub mod view_models;
pub mod models;
pub mod dto;
pub mod utils;
pub mod errors;

use std::sync::Arc;
use actix_web::{web, App, HttpServer};
use actix_cors::Cors;
use dashmap::DashMap;
use models::database;
use utils::tracing;
use tokio::sync::broadcast;
use std::env::var;
use std::process;

use crate::views::{
    hello_world::hello_world,
    setup_account::setup_account,
    setup_account_image_upload::setup_account_image_upload,
    setup_account_check::check,
    uploads_images::uploads_images,
    login::login,
    settings_profile_image_upload::settings_profile_image_upload,
    check_credentials::check_credentials,
    websocket_dashboard_metrics::websocket_dashboard_metrics,
    get_server_time::server_time,
    get_avatar::get_avatar,
    settings_profile_settings_get::settings_profile_settings_get,
    settings_profile_settings_post::settings_profile_settings_post,
    settings_security_settings::settings_security_settings,
    settings_logs_read_log::read_log,
    settings_logs_search_log::search_log,
    settings_logs_clear_logs::clear_log,
    gallery_upload_video::upload_video,
    gallery_get_videos::get_videos,
    uploads_videos::uploads_videos,
    uploads_videos_thumbnails::uploads_videos_thumbnails,
    gallery_rename_video::rename_video,
    gallery_delete_video::delete_video,
    gallery_delete_all_videos::delete_all_videos,
    gallery_search_video::search_video,
    gallery_import_from_drive::import_from_drive,
    live_stream_create_stream::create_live_stream as live_stream_create_stream,
    live_stream_get_videos::get_videos as live_stream_get_videos,
    live_stream_create_stream_search_video::search_video as create_stream_search_video,
    live_stream_get_live_streams::get_live_streams,
    live_stream_delete_stream::delete_stream,
    live_stream_edit_stream_get::get_live_stream as edit_stream_get_live_stream,
    live_stream_edit_stream_post::update_live_stream_data,
    live_stream_search_stream::search_live_stream,
    live_stream_start::live_stream_start,
    live_stream_stop::stop_stream,
    live_stream_cancel::cancel_stream,
    live_stream_monitor::monitor,
    history::get_histories,
    history_delete::delete_history,
    history_search::search_history,
    history_delete_all::delete_all
};
use crate::models::websocket_dashboard_metrics::metrics_collector;
use crate::dto::live_stream_state::LiveStreamState;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    tracing::init();

    let database_user = match var("DATABASE_USER") {
        Ok(val) => val,
        Err(_err) => {
            eprintln!("Missing DATABASE_USER key in env.");
            process::exit(1);
        }
    };
    let database_password = match var("DATABASE_PASSWORD") {
        Ok(val) => val,
        Err(_err) => {
            eprintln!("Missing DATABASE_PASSWORD key in env.");
            process::exit(2);
        }
    };
    let database_host = match var("DATABASE_HOST") {
        Ok(val) => val,
        Err(_err) => {
            eprintln!("Missing DATABASE_HOST key in env.");
            process::exit(3);
        }
    };
    let database_name = match var("DATABASE_NAME") {
        Ok(val) => val,
        Err(_err) => {
            eprintln!("Missing DATABASE_NAME key in env.");
            process::exit(4);
        }
    };
    let frontend_host = match var("FRONTEND_HOST") {
        Ok(val) => val,
        Err(_err) => {
            eprintln!("Missing FRONTEND_HOST key in env.");
            process::exit(5);
        }
    };
    let frontend_port = match var("FRONTEND_PORT") {
        Ok(val) => val,
        Err(_err) => {
            eprintln!("Missing FRONTEND_PORT key in env.");
            process::exit(6);
        }
    };
    let port = match var("PORT") {
        Ok(val) => {
            let val_int: u16 = match val.trim().parse() {
                Ok(val) => val,
                Err(_err) => {
                    eprintln!("Failed to parse PORT from env.");
                    process::exit(7);
                }
            };

            val_int
        },
        Err(_err) => {
            eprintln!("Missing PORT key in env.");
            process::exit(8);
        }
    };

    let pool = match database::pool(
        database_user,
        database_password,
        database_host,
        database_name
    ).await {
        Ok(val) => val,
        Err(_) => {
            eprintln!("Failed to get database pool.");
            process::exit(1);
        }
    };
    let allowed_origin = format!("http://{}:{}", frontend_host, frontend_port);

    match database::migrate(&pool).await {
        Ok(_) => (),
        Err(err) => {
            eprintln!("Failed to migrate database.");
            eprintln!("{}", err.to_string());
            process::exit(1);
        }
    }

    let state = Arc::new(LiveStreamState {
        jobs: DashMap::new()
    });
    let (tx, _) = broadcast::channel(16);
    
    // Start background metrics task
    tokio::spawn(metrics_collector(tx.clone()));

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin(&allowed_origin)
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
            .allowed_header(actix_web::http::header::AUTHORIZATION)
            .allowed_header(actix_web::http::header::ACCEPT)
            .allowed_header(actix_web::http::header::CONTENT_TYPE)
            .allowed_header(actix_web::http::header::ACCESS_CONTROL_ALLOW_CREDENTIALS)
            .supports_credentials()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(actix_web::web::Data::new(pool.clone()))
            .app_data(web::Data::new(tx.clone()))
            .app_data(web::Data::new(state.clone()))
            
            .route("/hello", web::get().to(hello_world))
            
            .route("/setup-account", web::put().to(setup_account))
            .route("/setup-account/image-upload", web::put().to(setup_account_image_upload))
            .route("/setup-account/check", web::get().to(check))
            .route("/login", web::post().to(login))
            .route("/check-credentials", web::get().to(check_credentials))
            .route("/websocket-dashboard-metrics", web::get().to(websocket_dashboard_metrics))
            .route("/get-server-time", web::get().to(server_time))
            .route("/get-avatar", web::get().to(get_avatar))
            .route("/settings/profile/get", web::get().to(settings_profile_settings_get))
            .route("/settings/profile/post", web::post().to(settings_profile_settings_post))
            .route("/settings/security", web::post().to(settings_security_settings))
            .route("/settings/logs/read/{last_n_lines}", web::get().to(read_log))
            .route("/settings/logs/search", web::get().to(search_log))
            .route("/settings/logs/clear", web::get().to(clear_log))
            .route("/settings/profile/image-upload", web::put().to(settings_profile_image_upload))
            .route("/gallery/upload-video", web::post().to(upload_video))
            .route("/gallery/get-videos/{page}/{page_size}/{order}", web::get().to(get_videos))
            .route("/gallery/rename-video", web::get().to(rename_video))
            .route("/gallery/delete-video/{video_id}", web::get().to(delete_video))
            .route("/gallery/delete-all-videos", web::get().to(delete_all_videos))
            .route("/gallery/search-video", web::get().to(search_video))
            .route("/gallery/import-from-drive", web::get().to(import_from_drive))
            .route("/live-stream/create-stream", web::post().to(live_stream_create_stream))
            .route("/live-stream/create-stream/search-video", web::get().to(create_stream_search_video))
            .route("/live-stream/get-videos", web::get().to(live_stream_get_videos))
            .route("/live-stream/get-live-streams", web::get().to(get_live_streams))
            .route("/live-stream/delete-stream/{id}", web::get().to(delete_stream))
            .route("/live-stream/edit-stream/get/{id}", web::get().to(edit_stream_get_live_stream))
            .route("/live-stream/edit-stream/post", web::post().to(update_live_stream_data))
            .route("/live-stream/search-stream", web::get().to(search_live_stream))
            .route("/live-stream/start/{live_stream_id}", web::get().to(live_stream_start))
            .route("/live-stream/stop/{live_stream_id}", web::get().to(stop_stream))
            .route("/live-stream/cancel/{live_stream_id}", web::get().to(cancel_stream))
            .route("/live-stream/monitor", web::get().to(monitor))
            .route("/history/get", web::get().to(get_histories))
            .route("/history/delete/{id}", web::get().to(delete_history))
            .route("/history/search", web::get().to(search_history))
            .route("/history/delete-all", web::get().to(delete_all))

            .route("/uploads/images", web::get().to(uploads_images))
            .route("/uploads/videos", web::get().to(uploads_videos))
            .route("/uploads/videos/thumbnails", web::get().to(uploads_videos_thumbnails))

    })
    .bind(("127.0.0.1", port))?
    .run()
    .await
}