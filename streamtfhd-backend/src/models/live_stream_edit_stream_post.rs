use sqlx::{Pool, Postgres};
use tracing::{error, debug};

use crate::{
    errors::AppError,
    dto::live_stream_edit_stream_post::LiveStream
};

pub async fn get_live_stream_owner(
    id: i64,
    pool: &Pool<Postgres>
) -> Result<Option<String>, AppError> {
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

            return Err(AppError::Database(err));
        }
    };

    Ok(ret)
}

pub async fn update_live_stream_data(
    data: &LiveStream,
    pool: &Pool<Postgres>
) -> Result<bool, AppError> {
    let res = sqlx::query(
        r#"
        UPDATE live_streams
        SET title = $1,
            video = $2,
            rtmp_url = $3,
            stream_key = $4,
            stream_loop = $5,
            schedule_start = $6,
            schedule_end = $7
        WHERE id = $8
        "#
    )
        .bind(&data.title)
        .bind(data.video)
        .bind(&data.rtmp_url)
        .bind(&data.stream_key)
        .bind(data.stream_loop)
        .bind(data.schedule_start)
        .bind(data.schedule_end)
        .bind(data.id)
        .execute(pool)
        .await;
    let result = match res {
        Ok(val) => val,
        Err(err) => {
            error!("Failed to update live stream data.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    };

    Ok(result.rows_affected() > 0)
}