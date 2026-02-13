use sqlx::{Pool, Postgres};
use tracing::{error, debug};

use crate::{
    dto::live_stream_start::LiveStreamData,
    errors::AppError
};

pub async fn get_live_stream_data(
    id: i64,
    pool: &Pool<Postgres>
) -> Result<Option<LiveStreamData>, AppError> {
    let res = sqlx::query_as::<_, LiveStreamData>(
        r#"
        SELECT
                live_streams.id,
                live_streams.owner,
                videos.file as video_file,
                live_streams.rtmp_url,
                live_streams.stream_key,
                live_streams.stream_loop,
                live_streams.schedule_start,
                live_streams.schedule_end
        FROM live_streams
        INNER JOIN videos
            ON live_streams.video = videos.id
        WHERE live_streams.id = $1
        "#
    )
    .bind(id)
    .fetch_one(pool)
    .await;

    let live_stream_data = match res {
        Ok(val) => Some(val),
        Err(err) => {
            error!("Failed to get live stream data.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(live_stream_data)
}