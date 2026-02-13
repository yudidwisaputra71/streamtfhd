use reqwest::Client;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use futures_util::StreamExt;
use mime_guess::mime;
use tracing::{error, debug};
use regex::Regex;

use crate::errors::AppError;

pub fn is_valid_google_drive_file_url(url: &str) -> bool {
    // Patterns for valid Google Drive FILE URLs
    let patterns = [
        // Standard file view link:
        // https://drive.google.com/file/d/<ID>/view
        r"^https?://drive\.google\.com/file/d/[a-zA-Z0-9_-]+",

        // Open by id:
        // https://drive.google.com/open?id=<ID>
        r"^https?://drive\.google\.com/open\?id=[a-zA-Z0-9_-]+",

        // Direct download:
        // https://drive.google.com/uc?id=<ID>&export=download
        r"^https?://drive\.google\.com/uc\?id=[a-zA-Z0-9_-]+",

        // Alternate format:
        // https://drive.google.com/uc?export=download&id=<ID>
        r"^https?://drive\.google\.com/uc\?export=download&id=[a-zA-Z0-9_-]+",
    ];

    for pattern in patterns {
        if let Ok(re) = Regex::new(pattern) {
            if re.is_match(url) {
                return true;
            }
        }
    }

    false
}

pub fn extract_google_drive_file_id_from_url(url: &str) -> Option<String> {
    // Common Google Drive file ID patterns
    let patterns = [
        // https://drive.google.com/file/d/<ID>/view
        r"/file/d/([a-zA-Z0-9_-]+)",

        // https://drive.google.com/open?id=<ID>
        r"[?&]id=([a-zA-Z0-9_-]+)",

        // https://drive.google.com/uc?id=<ID>
        r"[?&]id=([a-zA-Z0-9_-]+)",

        // https://drive.google.com/drive/folders/<ID> (for folders, optional)
        //r"/folders/([a-zA-Z0-9_-]+)",
    ];

    for pattern in patterns {
        let re = Regex::new(pattern).ok()?;
        if let Some(caps) = re.captures(url) {
            if let Some(m) = caps.get(1) {
                return Some(m.as_str().to_string());
            }
        }
    }

    None
}

/*
    https://drive.google.com/file/d/1N8b0Sk5-ONo7o8OS2EO0ehE6sOq8-Nhr/view?usp=drive_link
*/
pub async fn download_video_google_drive(
    file_id: &str,
    output_dir: &str,
) -> Result<String, AppError> {

    let client = Client::builder()
        .cookie_store(true)
        .build()?;

    let base_url = format!(
        "https://drive.google.com/uc?export=download&id={}",
        file_id
    );

    // First request
    let mut response = match client.get(&base_url).send().await {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to send request to Google Drive.");
            debug!("{}", err);

            return Err(AppError::ReqwestError(err));
        }
    };

    // Handle confirmation token for large files
    if let Some(token) = extract_confirm_token(&response) {
        let confirmed_url = format!(
            "https://drive.google.com/uc?export=download&confirm={}&id={}",
            token, file_id
        );

        response = match client.get(&confirmed_url).send().await {
            Ok(val) => val,
            Err(err) => {
                error!("Failed to send request to Google Drive.");
                debug!("{}", err);

                return Err(AppError::ReqwestError(err));
            }
        };
    }

    // 🔒 STEP 1 — Validate that this is a VIDEO file
    let (filename, mime) = match detect_filename_and_mime(&response) {
        Some(val) => val,
        None => {
            error!("Failed to detect file name and mime.");

            return Err(AppError::DetectFileNameAndMimeTypeError);
        }
    };

    // Only allow video/*
    if !mime.type_().eq(&mime::VIDEO) {
        return Err(AppError::NotAVideoFile("The provided link is not a vido file.".to_string()));
    }

    // 🔹 Detect extension safely
    let final_filename = filename.unwrap_or_else(|| {
        // fallback name if Google doesn't give filename
        if let Some(exts) = mime_guess::get_mime_extensions_str(mime.as_ref()) {
            format!("{}.{}", file_id, exts[0])
        } else {
            format!("{}", file_id)
        }
    });

    let full_path = format!("{}/{}", output_dir, final_filename);

    // Create output file
    let mut file = match File::create(&full_path).await {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to create file.");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    };

    // Stream response body to disk
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let data = match chunk {
            Ok(val) => val,
            Err(err) => {
                error!("Failed to read data from stream.");
                debug!("{}", err);

                return Err(AppError::ReqwestError(err));
            }
        };

        match file.write_all(&data).await {
            Ok(_) => (),
            Err(err) => {
                error!("Failed to write data.");
                debug!("{}", err);

                return Err(AppError::IO(err));
            }
        }
    }

    match file.flush().await {
        Ok(_) => (),
        Err(err) => {
            error!("Failed to flush file.");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    }

    Ok(final_filename)
}

fn extract_confirm_token(response: &reqwest::Response) -> Option<String> {
    for cookie in response.cookies() {
        if cookie.name().starts_with("download_warning") {
            return Some(cookie.value().to_string());
        }
    }
    None
}

fn detect_filename_and_mime(
    response: &reqwest::Response,
) -> Option<(Option<String>, mime::Mime)> {

    // 🔹 Get MIME type (MANDATORY)
    let content_type = response.headers()
        .get(reqwest::header::CONTENT_TYPE)?
        .to_str().ok()?;

    let mime: mime::Mime = content_type.parse().ok()?;

    // 🔹 Try get filename from Content-Disposition
    let filename = response.headers()
        .get(reqwest::header::CONTENT_DISPOSITION)
        .and_then(|h| h.to_str().ok())
        .and_then(|h| extract_filename_from_disposition(h));

    Some((filename, mime))
}

fn extract_filename_from_disposition(header: &str) -> Option<String> {
    // Example:
    // Content-Disposition: attachment; filename="video.mp4"

    for part in header.split(';') {
        let part = part.trim();
        if part.starts_with("filename=") {
            let name = part.trim_start_matches("filename=");
            let name = name.trim_matches('"');
            return Some(name.to_string());
        }
    }

    None
}