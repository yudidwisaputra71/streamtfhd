use actix_multipart::Multipart;
use crate::errors::AppError;

pub async fn image_upload(
    payload: Multipart,
    upload_directory: &String
) -> Result<String, AppError> {
    let ret = crate::models::setup_account_image_upload::image_upload(payload, &upload_directory).await?;

    Ok(ret)
}