use sqlx::{Pool, Postgres};
use crate::errors::AppError;
use crate::view_models::setup_account::AddUser;
use tracing::{error, debug};

pub async fn add_user(
    pool: &Pool<Postgres>,
    data: AddUser
) -> Result<bool, AppError> {
    let ret = sqlx::query(
        "INSERT INTO users (
                id,
                avatar,
                username,
                password_hash,
                role,
                created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6
            )"
    )
        .bind(data.id)
        .bind(data.avatar)
        .bind(data.username)
        .bind(data.password_hash)
        .bind(data.role as i32)
        .bind(data.created_at as i64)
        .execute(pool)
        .await;

    match ret {
        Ok(_) => (),
        Err(err) => {
            error!("Failed to add user to dabase.");
            debug!("{}", err);

            return Err(AppError::Database(err));
        }
    }

    Ok(true)
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn add_user() {
        let pool = crate::models::database::pool(
            "septian".to_string(),
            "674522".to_string(),
            "localhost".to_string(),
            "streamtfhd".to_string()
        ).await.unwrap();
        let data = crate::view_models::setup_account::AddUser {
            id: uuid::Uuid::new_v4().to_string(),
            avatar: None,
            username: "septian".to_string(),
            password_hash: "fdarewqrewq".to_string(),
            role: 0,
            created_at: crate::utils::time::current_unix_timestamp()
        };

        let add_user = super::add_user(&pool, data).await.unwrap();

        assert_eq!(add_user, true);
    }
}