pub fn get(path: String) -> impl actix_web::Responder {
    match std::fs::read(&path) {
        Ok(val) => {
            let mime = get_mime_type(path);
            return actix_web::HttpResponse::Ok().content_type(mime).body(val)
        }
        Err(err) => {
            if err.kind() == std::io::ErrorKind::NotFound {
                return actix_web::HttpResponse::NotFound().body("Not found.")
            } else {
                return actix_web::HttpResponse::InternalServerError().body("Internal server error.")
            }
        }
    }
}

fn get_mime_type(file_path: String) -> mime_guess::Mime {
    // Detect mime type by file extension
    let mime_type = mime_guess::from_path(file_path).first_or(mime_guess::mime::APPLICATION_OCTET_STREAM);
    let str = mime_type;

    str
}