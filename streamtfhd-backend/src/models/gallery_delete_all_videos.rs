use sqlx::{Pool, Postgres, prelude::FromRow};
use std::fs;
use tracing::{error, debug};

use crate::errors::AppError;

#[derive(Debug, FromRow)]
struct VideoAndThumbnailFiles {
    file: String,
    thumbnail: String
}

fn delete_video_file(
    video_file: &String,
    upload_directory: &String
) -> Result<bool, AppError> {
    let video_path = format!("{}/videos/{}", upload_directory, video_file);

    match fs::remove_file(video_path) {
        Ok(_) => (),
        Err(err) => {
            error!("Failed to delete video file.");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    }

    Ok(true)
}

fn delete_thumbnail_file(
    thumbnail_file: &String,
    upload_directory: &String
) -> Result<bool, AppError> {
    let thumbnail_path = format!("{}/videos/thumbnails/{}", upload_directory, thumbnail_file);

    match fs::remove_file(thumbnail_path) {
        Ok(_) => (),
        Err(err) => {
            error!("Failed to delete thumbnail file.");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    }

    Ok(true)
}

async fn get_video_and_thumbnail_files(
    owner: &String,
    pool: &Pool<Postgres>
) -> Result<Vec<VideoAndThumbnailFiles>, AppError> {
    let result = sqlx::query_as::<_, VideoAndThumbnailFiles>(
        "
            SELECT file, thumbnail FROM videos
            WHERE owner = $1
        "
    )
    .bind(owner)
    .fetch_all(pool)
    .await;

    let videos_and_thumbnails = match result {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get video and thumbnail files from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(videos_and_thumbnails)
}

fn delete_video_and_thumbnail_files(
    videos_and_thumbnails: &Vec<VideoAndThumbnailFiles>,
    upload_directory: &String
) -> Result<bool, AppError> {
    for i in videos_and_thumbnails {
        delete_thumbnail_file(&i.thumbnail, &upload_directory)?;
        delete_video_file(&i.file, &upload_directory)?;
    }
    
    Ok(true)
}

async fn delete_videos_from_database(
    owner: &String,
    pool: &Pool<Postgres>
) -> Result<bool, AppError> {
    let res = sqlx::query(
        r#"
        DELETE FROM videos
        WHERE owner = $1
        "#
    )
        .bind(owner)
        .execute(pool)
        .await;
    let result = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to delete videos from database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(result.rows_affected() > 0)
}

pub async fn delete_all_videos(
    user_id: &String,
    upload_directory: &String,
    pool: &Pool<Postgres>
) -> Result<bool, AppError> {
    let video_and_thumbnail_files = get_video_and_thumbnail_files(&user_id, &pool).await?;

    delete_video_and_thumbnail_files(&video_and_thumbnail_files, &upload_directory)?;
    delete_videos_from_database(&user_id, &pool).await?;

    Ok(true)
}

#[cfg(test)]
mod tests {

    #[tokio::test]
    async fn get_video_and_thumbnail_files() {
        let pool = crate::models::database::pool(
            "septian".to_string(),
            "674522".to_string(),
            "localhost".to_string(),
            "streamtfhd".to_string()
        ).await.unwrap();
        let owner = "1670806f-b51d-431e-9ee5-ab2829a78995".to_string();
        let videos_and_thumbnails = super::get_video_and_thumbnail_files(&owner, &pool).await.unwrap();

        println!("{:#?}", videos_and_thumbnails);
    }

    #[tokio::test]
    async fn delete_video_and_thumbnail_files() {
        let pool = crate::models::database::pool(
            "septian".to_string(),
            "674522".to_string(),
            "localhost".to_string(),
            "streamtfhd".to_string()
        ).await.unwrap();
        let owner = "1670806f-b51d-431e-9ee5-ab2829a78995".to_string();
        let videos_and_thumbnails = super::get_video_and_thumbnail_files(&owner, &pool).await.unwrap();
        let upload_directory = "./uploads".to_string();

        let delete = super::delete_video_and_thumbnail_files(&videos_and_thumbnails, &upload_directory).unwrap();

        assert_eq!(delete, true);
    }

    #[tokio::test]
    async fn delete_videos_from_database() {
        let pool = crate::models::database::pool(
            "septian".to_string(),
            "674522".to_string(),
            "localhost".to_string(),
            "streamtfhd".to_string()
        ).await.unwrap();
        let owner = "1670806f-b51d-431e-9ee5-ab2829a78995".to_string();
        let delete = super::delete_videos_from_database(&owner, &pool).await.unwrap();

        assert_eq!(delete, true);
    }
}