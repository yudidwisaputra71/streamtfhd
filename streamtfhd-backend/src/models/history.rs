use sqlx::{Pool, Postgres};
use tracing::{debug, error};

use crate::{
    dto::live_stream_history::History,
    errors::AppError
};

pub async fn get_histories(
    owner: &String,
    pool: &Pool<Postgres>
) -> Result<Vec<History>, AppError> {
    let history_result = sqlx::query_as::<_, History>(
        r#"
        SELECT
                live_stream_history.id,
                live_streams.title AS live_stream_title,
                videos.thumbnail AS video_thumbnail,
                live_stream_history.start_time,
                live_stream_history.end_time
        FROM live_stream_history
        INNER JOIN live_streams
            ON live_stream_history.live_stream = live_streams.id
        INNER JOIN videos
            ON live_streams.video = videos.id
        WHERE live_stream_history.owner = $1
            AND live_stream_history.end_status IN ('Stopped', 'Done')
        ORDER BY id DESC
        "#
    )
        .bind(&owner)
        .fetch_all(pool)
        .await;

    let histories = match history_result {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get live stream history data.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(histories)
}