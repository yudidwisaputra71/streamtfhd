use actix_web::{HttpRequest, HttpResponse, Result};
use actix_web::http::header;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use mime_guess::from_path;
use mime_guess::mime;

use crate::errors::AppError;

pub async fn stream_video(
    video_file: &String,
    upload_directory: &String,
    req: &HttpRequest
) -> Result<HttpResponse, AppError> {
    let video_path = format!("{}/videos/{}", upload_directory, video_file);
    let path = Path::new(&video_path);

    // 🔒 STEP 1 — Check if file exists
    if !path.exists() || !path.is_file() {
        return Ok(HttpResponse::NotFound().body("Video not found"));
    }

    // Open file safely
    let mut file = match File::open(path) {
        Ok(f) => f,
        Err(_) => {
            return Ok(HttpResponse::NotFound().body("Video not found"));
        }
    };

    let file_size = match file.metadata() {
        Ok(meta) => meta.len(),
        Err(_) => {
            return Ok(HttpResponse::NotFound().body("Video not found"));
        }
    };

    // 🔹 Auto detect MIME type (mime_guess 2.0.5)
    let mime = from_path(path).first_or_octet_stream();
    let content_type = mime.to_string();

    // 🔒 Allow only video/*
    if mime.type_() != mime::VIDEO {
        return Ok(HttpResponse::UnsupportedMediaType()
            .body("Not a video file"));
    }

    // 🔹 Handle Range header (for seeking support)
    if let Some(range_header) = req.headers().get(header::RANGE) {
        let range_str = match range_header.to_str() {
            Ok(v) => v,
            Err(_) => {
                return Ok(HttpResponse::BadRequest().body("Invalid Range header"));
            }
        };

        let (start, end) = parse_range(range_str, file_size)?;

        // Seek to start position
        if let Err(_) = file.seek(SeekFrom::Start(start)) {
            return Ok(HttpResponse::InternalServerError().finish());
        }

        let chunk_size = end - start + 1;
        let mut buffer = vec![0; chunk_size as usize];

        if let Err(_) = file.read_exact(&mut buffer) {
            return Ok(HttpResponse::InternalServerError().finish());
        }

        Ok(HttpResponse::PartialContent()
            .insert_header((
                header::CONTENT_RANGE,
                format!("bytes {}-{}/{}", start, end, file_size),
            ))
            .insert_header((header::ACCEPT_RANGES, "bytes"))
            .insert_header((header::CONTENT_LENGTH, buffer.len().to_string()))
            .insert_header((header::CONTENT_TYPE, content_type))
            .body(buffer))
    } else {
        // ✅ Correct way for actix-files 0.6.9 (NO into_body)
        let named_file = actix_files::NamedFile::open(path)?
            .set_content_type(mime);

        let mut response = named_file.into_response(&req);

        // Add Accept-Ranges header manually
        response.headers_mut().insert(
            header::ACCEPT_RANGES,
            header::HeaderValue::from_static("bytes"),
        );

        Ok(response)
    }
}

fn parse_range(range_header: &str, file_size: u64) -> Result<(u64, u64), actix_web::Error> {
    // Example: "bytes=0-1023"
    let range = range_header.replace("bytes=", "");
    let parts: Vec<&str> = range.split('-').collect();

    let start: u64 = parts[0].parse().unwrap_or(0);

    let mut end: u64 = if parts.len() > 1 && !parts[1].is_empty() {
        parts[1].parse().unwrap_or(file_size - 1)
    } else {
        file_size - 1
    };

    if end >= file_size {
        end = file_size - 1;
    }

    Ok((start, end))
}