pub mod utils;

use std::env::var;
use actix_web::web;
use actix_web::Responder;
use actix_web::get;
use std::process;

use crate::utils::files::get as get_file;

#[get("/css/{name}")]
async fn css(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/css/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/assets/{name}")]
async fn assets(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/assets/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/vendors/tabler/3.36.1/{name}")]
async fn vendors_tabler_icons(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/vendors/tabler/3.36.1/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/vendors/tabler/3.36.1/fonts/{name}")]
async fn vendors_tabler_icons_fonts(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/vendors/tabler/3.36.1/fonts/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/vendors/bootstrap/5.3.8/css/{name}")]
async fn vendors_bootstrap_css(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/vendors/bootstrap/5.3.8/css/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/vendors/bootstrap/5.3.8/js/{name}")]
async fn vendors_bootstrap_js(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/vendors/bootstrap/5.3.8/js/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/vendors/video-js/8.23.4/{name}")]
async fn vendors_video_js(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/vendors/video-js/8.23.4/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/vendors/ansi_up/5.1.0/{name}")]
async fn vendors_ansi_up(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/vendors/ansi_up/5.1.0/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/js/{name}")]
async fn js(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/js/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/js/View/{name}")]
async fn js_view(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/js/View/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/js/ViewModel/{name}")]
async fn js_viewmodel(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/js/ViewModel/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/js/Utils/{name}")]
async fn js_utils(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/js/Utils/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/js/Model/{name}")]
async fn js_model(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/js/Model/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/js/Errors/{name}")]
async fn js_errors(
    name: web::Path<String>,
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/js/Errors/{}", html_dir.into_inner(), name);

    get_file(path)
}

#[get("/")]
async fn index(
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/index.html", html_dir.into_inner());
    
    get_file(path)
}

#[get("/gallery")]
async fn gallery(
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/gallery.html", html_dir.into_inner());
    
    get_file(path)
}

#[get("/history")]
async fn history(
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/history.html", html_dir.into_inner());

    get_file(path)
}

#[get("/settings")]
async fn settings(
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/settings.html", html_dir.into_inner());

    get_file(path)
}

#[get("/setup-account")]
async fn setup_account(
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/setup-account.html", html_dir.into_inner());

    get_file(path)
}

#[get("/login")]
async fn login(
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/login.html", html_dir.into_inner());

    get_file(path)
}

#[get("/logout")]
async fn logout(
    html_dir: web::Data<String>
) -> impl Responder {
    let path = format!("{}/logout.html", html_dir.into_inner());

    get_file(path)
}

#[actix_web::main] // or #[tokio::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();

    let html_dir = match var("HTML_DIR") {
        Ok(val) => val,
        Err(_err) => {
            eprintln!("Missing HTML_DIR key in env.");
            process::exit(1);
        }
    };
    let port = match var("PORT") {
        Ok(val) => {
            let val_int: u16 = match val.trim().parse() {
                Ok(val) => val,
                Err(_err) => {
                    eprintln!("Failed to parse PORT from env.");
                    process::exit(2);
                    
                }
            };

            val_int
        },
        Err(_err) => {
            eprintln!("Missing PORT key in env.");
            process::exit(3);
        }
    };

    actix_web::HttpServer::new( move || {
        actix_web::App::new()
            .app_data(web::Data::new(html_dir.clone()))

            .service(css)
            .service(assets)
            .service(vendors_tabler_icons)
            .service(vendors_tabler_icons_fonts)
            .service(vendors_bootstrap_css)
            .service(vendors_bootstrap_js)
            .service(vendors_video_js)
            .service(vendors_ansi_up)
            .service(index)
            .service(js)
            .service(js_view)
            .service(js_viewmodel)
            .service(js_model)
            .service(js_utils)
            .service(js_errors)
            .service(gallery)
            .service(history)
            .service(settings)
            .service(setup_account)
            .service(login)
            .service(logout)
    })
    .bind(("127.0.0.1", port))?
    .run()
    .await
}