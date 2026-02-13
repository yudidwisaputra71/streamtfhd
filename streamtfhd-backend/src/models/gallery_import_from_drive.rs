use sqlx::{Pool, Postgres};
use uuid::Uuid;
use std::fs;
use tracing::{debug, error, info};
use std::process::Command;
use std::path::Path;

use crate::errors::AppError;
use crate::utils::google_drive_video_downloader::{download_video_google_drive, extract_google_drive_file_id_from_url, is_valid_google_drive_file_url};
use crate::utils::time::current_unix_timestamp;

struct VideoResulution {
    width: i64,
    height: i64
}

// ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of default=noprint_wrappers=1:nokey=1 video.mp4
fn get_video_frame_rate(
    video_file: &String,
    upload_directory: &String
) -> Result<i32, AppError> {
    let video_path = format!("{}/videos/{}", upload_directory, video_file);
    let command = Command::new("ffprobe")
        .args([
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=avg_frame_rate",
                "-of", "default=noprint_wrappers=1:nokey=1",
                &video_path
            ])
        .output();

    info!("ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of default=noprint_wrappers=1:nokey=1 {}", video_path);

    let command_output = match command {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to execute ffprobe program while getting video frame rate.");
            debug!("{}", err);

            return Err(AppError::InternalError(String::from("Failed to execute ffprobe program while getting video frame rate.")));
        }
    };
    let command_status_code = match command_output.status.code() {
        Some(val) => val,
        None => 0
    };

    if command_status_code > 0 {
        let stderr = String::from_utf8_lossy(&command_output.stderr);

        debug!("{:?}", stderr);

        return Err(AppError::InternalError(String::from("Failed to get video frame rate.")));
    }

    let output = String::from_utf8_lossy(&command_output.stdout).to_string();

    let parts: Vec<&str> = output.trim().split('/').collect();
    
    if parts.len() != 2 {
        error!("Invalid fps format.");

        return Err(AppError::InternalError("Invalid fps format".to_string()));
    }

    let num_float: f64 = match parts[0].parse() {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to parse string to float.");
            debug!("{}", err);

            return Err(AppError::ParseFloatError);
        }
    };
    let den_float: f64 = match parts[1].parse() {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to parse string to float.");
            debug!("{}", err);

            return Err(AppError::ParseFloatError);
        }
    };

    let fps_float = num_float / den_float;
    let fps_int: i32 = fps_float as i32;

    Ok(fps_int)
}

// ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp4
// Output in seconds
fn get_video_length(
    video_file: &String,
    upload_directory: &String
) -> Result<i64, AppError> {
    let video_path = format!("{}/videos/{}", upload_directory, video_file);
    let command = Command::new("ffprobe")
        .args([
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                &video_path
            ])
        .output();

    info!("ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 {}", video_path);

    let command_output = match command {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to execute ffprobe program while getting video length.");
            debug!("{}", err);

            return Err(AppError::InternalError(String::from("Failed to execute ffprobe program while getting video length.")));
        }
    };
    let command_status_code = match command_output.status.code() {
        Some(val) => val,
        None => 0
    };

    if command_status_code > 0 {
        let stderr = String::from_utf8_lossy(&command_output.stderr);

        debug!("{:?}", stderr);

        return Err(AppError::InternalError(String::from("Failed to create video thumbnail file")));
    }

    let output = String::from_utf8_lossy(&command_output.stdout).to_string();
    let output_fload: f64 = match output.trim().parse() {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to parse value to float.");
            debug!("{}", err);

            return Err(AppError::ParseFloatError);
        }
    };

    Ok(output_fload as i64)
}

// ffprobe -v error -show_entries format=bit_rate -of default=noprint_wrappers=1:nokey=1 video.mp4
// Output in kbps
fn get_video_bit_rate(
    video_file: &String,
    upload_directory: &String
) -> Result<i64, AppError> {
    let video_path = format!("{}/videos/{}", upload_directory, video_file);
    let command = Command::new("ffprobe")
        .args([
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "format=bit_rate",
                "-of", "default=noprint_wrappers=1:nokey=1",
                &video_path
            ])
        .output();

    info!("ffprobe -v error -show_entries format=bit_rate -of default=noprint_wrappers=1:nokey=1 {}", video_path);

    let command_output = match command {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to execute ffprobe program while getting video bit rate.");
            debug!("{}", err);

            return Err(AppError::InternalError(String::from("Failed to execute ffprobe program while getting video resolution.")));
        }
    };
    let command_status_code = match command_output.status.code() {
        Some(val) => val,
        None => 0
    };

    if command_status_code > 0 {
        let stderr = String::from_utf8_lossy(&command_output.stderr);

        debug!("{:?}", stderr);

        return Err(AppError::InternalError(String::from("Failed to get video bit rate")));
    }

    let output = String::from_utf8_lossy(&command_output.stdout).to_string();
    let output_int: i64 = match output.trim().parse() {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to parse value to integer.");
            debug!("{}", err);

            return Err(AppError::ParseIntError);
        }
    };

    Ok(output_int / 1000)
}

// ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 video.mp4
fn get_video_resolution(
    video_file: &String,
    upload_directory: &String
) -> Result<VideoResulution, AppError> {
    let video_path = format!("{}/videos/{}", upload_directory, video_file);
    let command = Command::new("ffprobe")
        .args([
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height",
                "-of", "csv=s=x:p=0",
                &video_path
            ])
        .output();

    info!("ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 {}", video_path);

    let command_output = match command {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to execute ffprobe program while getting video resolution.");
            debug!("{}", err);

            return Err(AppError::InternalError(String::from("Failed to execute ffprobe program while getting video resolution.")));
        }
    };
    let command_status_code = match command_output.status.code() {
        Some(val) => val,
        None => 0
    };

    if command_status_code > 0 {
        let stderr = String::from_utf8_lossy(&command_output.stderr);

        debug!("{:?}", stderr);

        return Err(AppError::InternalError(String::from("Failed to get video resolution")));
    }

    let output = String::from_utf8_lossy(&command_output.stdout).to_string();
    let output_split:Vec<&str> = output.split("x").collect();

    if output_split.len() < 2 {
        error!("Failed to get video resolution.");

        return Err(AppError::InternalError("Failed to get video resolution.".to_string()));
    }

    let width_str = output_split[0];
    let height_str = output_split[1];
    let width: i64 = match width_str.trim().parse() {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to parse value to integer.");
            debug!("{}", err);

            return Err(AppError::ParseIntError);
        }
    };
    let height: i64 = match height_str.trim().parse() {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to parse value to integer.");
            debug!("{}", err);

            return Err(AppError::ParseIntError);
        }
    };

    Ok(VideoResulution { width, height })

}

async fn download_from_google_drive(
    google_drive_url: &String,
    output_path: &String
) -> Result<String, AppError> {
    if ! is_valid_google_drive_file_url(google_drive_url) {
        info!("An attemp to import from Google Drive with invalid link 1.");

        return Err(AppError::ValidationError("Invalid URL".to_string()));
    }

    let file_id = match extract_google_drive_file_id_from_url(google_drive_url) {
        Some(val) => val,
        None => {
            info!("An attemp to import from Google Drive with invalid link 2.");

            return Err(AppError::ValidationError("Invalid URL".to_string()));
        }
    };

    let download = download_video_google_drive(&file_id, &output_path).await?;

    Ok(download)
}

fn create_download_tmp_working_dir() -> Result<String, AppError> {
    let uuid = Uuid::new_v4();
    let tmp_dir = format!("{}-streamtfhd", uuid);
    let tmp_dir_path = format!("/tmp/{}", tmp_dir);
    
    match fs::create_dir_all(&tmp_dir_path) {
        Ok(_) => (),
        Err(err) => {
            error!("Failed to create temp dir.");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    };

    Ok(tmp_dir_path)
}

fn remove_download_tmp_working_dir(tmp_dir_path: String) -> Result<bool, AppError> {
    match fs::remove_dir_all(tmp_dir_path) {
        Ok(_) => (),
        Err(err) => {
            error!("Failed to remove tmp dir and its content(s).");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    }

    Ok(true)
}

async fn rename_and_copy_imported_video_to_upload_dir(
    source_video_path: &String,
    upload_dir: &String    
) -> Result<String, AppError> {
    let create_dir = format!("{}/videos/", upload_dir);
    let file_name = match get_filename(&source_video_path) {
        Some(val) => val,
        None => {
            error!("Failed to get file name from path.");
            
            return Err(AppError::InternalError("Failed to get file name from path.".to_string()));
        }
    };
    let uuid = uuid::Uuid::new_v4().to_string();
    let final_file_name = format!("{}-{}", uuid, file_name);
    
    match tokio::fs::create_dir_all(&create_dir).await {
        Ok(_) => (),
        Err(err) => {
            error!("Failed to create videos directory.");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    }

    let copy_to = format!("{}/videos/{}", upload_dir, final_file_name);
    
    match fs::copy(source_video_path, &copy_to) {
        Ok(_) => Ok(final_file_name),
        Err(err) => {
            error!("Failed to move imported video to {}.", copy_to);
            debug!("{}", err);

            Err(AppError::IO(err))
        }
    }
}

// ffmpeg -i input.mp4 -vf "thumbnail,scale=320:-1" -frames:v 1 output.jpg
async fn create_video_thumbnail(
    video_file: &String,
    upload_directory: &String
) -> Result<String, AppError> {
    let create_dir = format!("{}/videos/thumbnails", upload_directory);
    
    match tokio::fs::create_dir_all(&create_dir).await {
        Ok(_) => (),
        Err(err) => {
            error!("Failed to create thumbnail directory.");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    }
    
    let video_file_path = format!("{}/videos/{}", upload_directory, video_file);
    let output_thumbnail_file = format!("{}.jpg", video_file);
    let output_thumbnail_file_path = format!("{}/{}", create_dir, output_thumbnail_file);

    let command = Command::new("ffmpeg")
        .args([
                "-i",
                &video_file_path,
                "-vf",
                "thumbnail,scale=320:-1",
                "-frames:v",
                "1",
                &output_thumbnail_file_path
            ])
        .output();

    info!("ffmpeg -i {} -vf 'thumbnail,scale=320:-1' -frames:v 1 {}", video_file_path, output_thumbnail_file_path);

    let command_output = match command {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to execute external program while creating video thumbnail.");
            debug!("{}", err);

            return Err(AppError::InternalError(String::from("Failed to execute external program while creating video thumbnail.")));
        }
    };
    let command_status_code = match command_output.status.code() {
        Some(val) => val,
        None => 0
    };

    if command_status_code > 0 {
        let stderr = String::from_utf8_lossy(&command_output.stderr);

        debug!("{:?}", stderr);

        return Err(AppError::InternalError(String::from("Failed to create video thumbnail file")));
    }

    Ok(output_thumbnail_file)
}

fn get_filename(path: &str) -> Option<&str> {
    Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
}

fn filename_without_extension(filename: &str) -> Option<&str> {
    Path::new(filename)
        .file_stem()
        .and_then(|s| s.to_str())
}

async fn save_video_info_to_database(
    pool: &Pool<Postgres>,
    upload_directory: &String,
    video_title: &String,
    video_file: &String,
    video_thumbnail_file: &String,
    owner: &String
) -> Result<bool, AppError> {
    let timestamp = current_unix_timestamp();
    let video_file_path = format!("{}/videos/{}", upload_directory, video_file);
    let video_resolution = get_video_resolution(&video_file, &upload_directory)?;
    let video_bit_rate = get_video_bit_rate(&video_file, &upload_directory)?;
    let video_frame_rate = get_video_frame_rate(&video_file, &upload_directory)?;
    let video_length = get_video_length(&video_file, &upload_directory)?;
    let video_size = match fs::metadata(video_file_path) {
        Ok(val) => val.len() / 1024,
        Err(err) => {
            error!("Failed to get video size.");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    };

    let insert = sqlx::query(
        "INSERT INTO videos (
                    owner,
                    title,
                    file,
                    thumbnail,
                    width,
                    height,
                    bit_rate,
                    frame_rate,
                    length,
                    size,
                    uploaded_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
                )"
    )
        .bind(owner)
        .bind(video_title)
        .bind(video_file)
        .bind(video_thumbnail_file)
        .bind(video_resolution.width)
        .bind(video_resolution.height)
        .bind(video_bit_rate)
        .bind(video_frame_rate)
        .bind(video_length)
        .bind(video_size as i64)
        .bind(timestamp as i64)
        .execute(pool)
        .await;

    match insert {
        Ok(_) => Ok(true),
        Err(err) => {
            error!("Failed to store video data to the database.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    }
}

pub async fn import_from_drive(
    google_drive_url: &String,
    upload_dir: &String,
    owner: &String,
    pool: &Pool<Postgres>
) -> Result<bool, AppError> {
    let tmp = create_download_tmp_working_dir()?;
    let downloaded = download_from_google_drive(google_drive_url, &tmp).await?;
    
    let video_path = format!("{}/{}", tmp, downloaded);
    let final_file_name = rename_and_copy_imported_video_to_upload_dir(&video_path, upload_dir).await?;

    let video_thumbnail = create_video_thumbnail(&final_file_name, &upload_dir).await?;
    
    let video_title = match filename_without_extension(&downloaded) {
        Some(val) => val,
        None => "Video"
    };
    let _save_to_database = save_video_info_to_database(&pool, &upload_dir, &video_title.to_string(), &final_file_name, &video_thumbnail, owner).await?;

    let _rm_tmp = remove_download_tmp_working_dir(tmp)?;

    Ok(true)
}

#[cfg(test)]
mod tests {

    #[tokio::test]
    async fn import_from_drive() {
        let pool = crate::models::database::pool(
            "septian".to_string(),
            "674522".to_string(),
            "localhost".to_string(),
            "streamtfhd".to_string()
        ).await.unwrap();
        let url = "https://drive.google.com/file/d/1N8b0Sk5-ONo7o8OS2EO0ehE6sOq8-Nhr/view?usp=drive_link".to_string();
        let download = super::import_from_drive(
            &url,
            &"./uploads".to_string(),
            &"1670806f-b51d-431e-9ee5-ab2829a78995".to_string(),
            &pool
        ).await.unwrap();

        assert_eq!(download, true);
    }
}