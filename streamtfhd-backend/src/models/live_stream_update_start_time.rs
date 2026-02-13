use sqlx::{Pool, Postgres};
use tracing::{error, debug};

use crate::utils::time::current_unix_timestamp;

pub async fn update_start_time(
    stream_id: i64,
    pool: &Pool<Postgres>
) -> bool {
    let now = current_unix_timestamp();
    let update = sqlx::query(
        "UPDATE live_streams
                SET started_at = $1
                WHERE id = $2"
    )
        .bind(now as i64)
        .bind(stream_id)
        .execute(pool)
        .await;

    match update {
        Ok(_) => true,
        Err(err) => {
            error!("Failed to update start time data.");
            debug!("{}", err);

            false
        }
    }
}