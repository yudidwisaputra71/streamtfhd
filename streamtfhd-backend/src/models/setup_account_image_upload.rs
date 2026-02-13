use actix_multipart::Multipart;
use crate::errors::AppError;
use futures_util::StreamExt;
use sanitize_filename::sanitize;
use tokio::{fs::File, io::AsyncWriteExt};
use uuid::Uuid;
use actix_web::mime;
use tracing::{warn};

const MAX_FILE_SIZE: usize = 2 * 1024 * 1024; // 2 MB

pub async fn image_upload(
    mut payload: Multipart,
    upload_directory: &String
) -> Result<String, AppError> {
    let mut stored_name = String::new();
    let mut filepath: String;
    
    let create_dir = format!("{}/images", upload_directory);
    tokio::fs::create_dir_all(create_dir).await?;

    while let Some(item) = payload.next().await {
        let mut field = item?;

        // ===== Validate MIME type =====
        let is_image = match field.content_type() {
            Some(mime) => mime.type_() == mime::IMAGE,
            None => false,
        };

        if !is_image {
            warn!("An attemp to upload non image file.");
            return Err(AppError::BadRequest("Only image files are allowed".to_string()));
        }

        // ===== Get filename =====
        let filename = field
            .content_disposition()
            .get_filename()
            .map(sanitize)
            .ok_or_else(|| AppError::BadRequest("Missing filename".to_string()))?;

        stored_name = format!("{}-{}", Uuid::new_v4(), filename);
        filepath = format!("{}/images/{}", upload_directory, stored_name);

        let mut file = File::create(&filepath).await?;
        let mut size: usize = 0;

        // ===== Stream & size limit enforcement =====
        while let Some(chunk) = field.next().await {
            let data = chunk?;
            size += data.len();

            if size > MAX_FILE_SIZE {
                warn!("An attemp to upload an image that more than the limit size.");
                
                return Err(
                    AppError::BadRequest("File size exceeds 2 MB limit".to_string())
                );
            }

            file.write_all(&data).await?;
        }
    }

    Ok(stored_name)
}