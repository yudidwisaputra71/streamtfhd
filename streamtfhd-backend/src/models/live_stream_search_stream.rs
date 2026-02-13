use sqlx::{Pool, Postgres};
use tracing::{debug, error};

use crate::{
    errors::AppError,
    dto::live_stream_search_stream::LiveStream
};

pub async fn search_live_stream(
    owner: &String,
    keyword: &String,
    pool: &Pool<Postgres>
) -> Result<Vec<LiveStream>, AppError> {
    let like_pattern = format!("%{}%", keyword);
    let result = sqlx::query_as::<_, LiveStream>(
        r#"
        SELECT
                live_streams.id AS live_stream_id,
                live_streams.title AS live_stream_title,
                live_streams.schedule_start AS live_stream_schedule_start,
                live_streams.schedule_end AS live_stream_schedule_end,
                live_streams.started_at AS live_stream_started_at,
                videos.id AS video_id,
                videos.thumbnail AS video_thumbnail,
                videos.width AS video_width,
                videos.height AS video_height,
                videos.bit_rate AS video_bit_rate,
                videos.frame_rate AS video_frame_rate
        FROM live_streams
        INNER JOIN videos
            ON live_streams.video = videos.id
        WHERE live_streams.owner = $1
            AND live_streams.title ILIKE $2
        ORDER BY live_streams.id DESC
        "#
    )
        .bind(owner)
        .bind(like_pattern)
        .fetch_all(pool)
        .await;

    let live_stream_datas = match result {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to search live stream datas.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(live_stream_datas)
}