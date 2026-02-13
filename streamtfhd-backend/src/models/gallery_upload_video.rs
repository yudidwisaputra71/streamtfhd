use sqlx::{Pool, Postgres};
use crate::errors::AppError;
use actix_multipart::Multipart;
use sanitize_filename::sanitize;
use futures_util::StreamExt;
use std::path::Path;
use uuid::Uuid;
use tokio::{fs::File, io::AsyncWriteExt};
use tracing::{error, debug, info};
use crate::utils::time::current_unix_timestamp;
use std::fs;
use std::process::Command;

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

    info!("Getting video frame rate.");
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

    info!("Getting video length.");
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

        return Err(AppError::InternalError(String::from("Failed to get video length")));
    }

    let output = String::from_utf8_lossy(&command_output.stdout).to_string();

    let output_float: f64 = match output.trim().parse() {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to parse value to float.");
            debug!("{}", err);

            return Err(AppError::ParseFloatError);
        }
    };

    Ok(output_float as i64)
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

    info!("Getting bit rate.");
    info!("ffprobe -v error -show_entries format=bit_rate -of default=noprint_wrappers=1:nokey=1 {}", video_path);

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

        return Err(AppError::InternalError(String::from("Failed to get video bit rate.")));
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

    info!("Getting video resolution.");
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

    info!("Creating video thumbnail.");
    info!("ffmpeg -i {} -vf 'thumbnail,scale=320:-1' -frames:v 1 {}", video_file_path, output_thumbnail_file_path);

    let command_output = match command {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to execute ffmpeg program while creating video thumbnail.");
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
    let video_length = get_video_length(&video_file, &upload_directory)?;
    let video_frame_rate = get_video_frame_rate(&video_file, &upload_directory)?;
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

pub async fn upload_video(
    mut payload: Multipart,
    pool: &Pool<Postgres>,
    upload_directory: &String,
    owner: &String
) -> Result<bool, AppError> {
    let create_dir = format!("{}/videos", upload_directory);
    match tokio::fs::create_dir_all(&create_dir).await {
        Ok(_) => (),
        Err(err) => {
            error!("Failed to create uploads directory.");
            debug!("{}", err);

            return Err(AppError::IO(err));
        }
    }

    while let Some(item) = payload.next().await {
        let mut field = item?;

        // ===== MIME TYPE VALIDATION =====
        let valid_mime = match field.content_type() {
            Some(mime) => matches!(
                mime.essence_str(),
                "video/mp4" | "video/quicktime" | "video/x-msvideo"
            ),
            None => false,
        };

        if !valid_mime {
            info!("An attemp to upload video with unsupported format.");
            return Err(AppError::BadRequest("Only MP4, AVI, and MOV files are allowed".to_string()));
        }

        // ===== EXTENSION VALIDATION =====
        let filename = field
            .content_disposition()
            .get_filename()
            .map(sanitize)
            .ok_or_else(|| AppError::BadRequest("Missing filename".to_string()))?;

        let ext = Path::new(&filename)
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .ok_or_else(|| AppError::BadRequest("Invalid file extension".to_string()))?;

        if !matches!(ext.as_str(), "mp4" | "avi" | "mov") {
            return Err(AppError::BadRequest("Only MP4, AVI, and MOV files are allowed".to_string()));
        }

        // ===== SAVE FILE =====
        let stored_name = format!("{}-{}", Uuid::new_v4(), filename);
        let filepath = format!("{}/videos/{}",upload_directory, stored_name);
        let mut file = match File::create(&filepath).await {
            Ok(val) => val,
            Err(err) => {
                error!("Failed to create upload file.");
                debug!("{}", err);

                return Err(AppError::InternalError(String::from("Failed to create upload file")));
            }
        };

        while let Some(chunk) = field.next().await {
            let data = match chunk {
                Ok(val) => val,
                Err(err) => {
                    error!("Failed to read chunk data.");
                    debug!("{}", err);

                    return Err(AppError::MultipartError(err));
                }
            };
            
            match file.write_all(&data).await {
                Ok(_) => (),
                Err(err) => {
                    error!("Failed to write chunk data.");
                    debug!("{}", err);

                    return Err(AppError::IO(err));
                }
            }
        }

        let video_thumbnail = create_video_thumbnail(&stored_name, &upload_directory).await?;
        let video_title = match filename_without_extension(&filename) {
            Some(val) => val,
            None => &filename
        };

        save_video_info_to_database(&pool, &upload_directory, &video_title.to_string(), &stored_name, &video_thumbnail, &owner).await?;
    }

    Ok(true)
}

fn filename_without_extension(filename: &str) -> Option<&str> {
    Path::new(filename)
        .file_stem()
        .and_then(|s| s.to_str())
}