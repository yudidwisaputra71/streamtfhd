use sqlx::{Pool, Postgres};
use tracing::{error, debug};

use crate::dto::live_stream_write_history::History;

pub async fn get_live_stream_owner(
    id: i64,
    pool: &Pool<Postgres>
) -> Option<String> {
    let res: Result<Option<String>, sqlx::Error> = sqlx::query_scalar(
        "SELECT owner FROM live_streams WHERE id = $1"
    )
        .bind(id)
        .fetch_optional(pool)
        .await;

    let ret = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to get live stream owner from database.");
            debug!("{}", err);

            None
        }
    };

    ret
}

pub async fn write_history(
    data: &History,
    pool: &Pool<Postgres>
) -> bool {
    let insert = sqlx::query(
        "INSERT INTO live_stream_history (
                    owner,
                    live_stream,
                    start_time,
                    end_time,
                    end_status
                ) VALUES (
                    $1, $2, $3, $4, $5
                )"
    )
        .bind(&data.owner)
        .bind(data.live_stream)
        .bind(data.start_time)
        .bind(data.end_time)
        .bind(&data.end_status)
        .execute(pool)
        .await;

    match insert {
        Ok(_) => true,
        Err(err) => {
            error!("Failed to store live stream history data to the database.");
            debug!("{}", err);

            false
        }
    }
}