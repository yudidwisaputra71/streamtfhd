use sqlx::{Pool, Postgres};
use tracing::{error, debug};

pub async fn empty_schedule(
    stream_id: i64,
    pool: &Pool<Postgres>
) -> bool {
    let update = sqlx::query(
        "UPDATE live_streams
                SET
                    schedule_start = $1,
                    schedule_end = $2
                WHERE id = $3"
    )
        .bind(None::<i64>)
        .bind(None::<i64>)
        .bind(stream_id)
        .execute(pool)
        .await;

    match update {
        Ok(_) => true,
        Err(err) => {
            error!("Failed to empty live stream schedule.");
            debug!("{}", err);

            false
        }
    }
}