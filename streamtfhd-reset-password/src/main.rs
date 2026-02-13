use std::env::var;
use argon2::password_hash;
use argon2::PasswordHasher;
use crate::password_hash::rand_core;
use sqlx::{PgPool, Pool, Postgres};
use std::io::{self, Write};
use std::process;

async fn pool(
    db_user: String,
    db_password: String,
    db_host: String,
    db_name: String
) -> Pool<Postgres> {
    let url = format!("postgres://{}:{}@{}/{}", db_user, db_password, db_host, db_name);
    let pool_result = PgPool::connect(&url).await;

    let pool = match pool_result {
        Ok(val) => val,
        Err(err) => {
            println!("Failed to create database pool.");
            println!("{}.", err.to_string());
            panic!();
        }
    };

    pool
}

async fn is_username_exist(
    username: String,
    pool: &Pool<Postgres>
) -> bool {
    let count_result: Result<i64, sqlx::Error> = sqlx::query_scalar(
        r#"
        SELECT COUNT(id)
        FROM users
        WHERE username = $1
        "#
    )
    .bind(&username)
    .fetch_one(pool)
    .await;

    let count = match count_result {
        Ok(val) => val,
        Err(err) => {
            println!("Failed to check if username is exist.");
            println!("{}", err.to_string());

            panic!();
        }
    };

    count > 0
}

fn hash_passowrd(password: &String) -> String {
    let salt = argon2::password_hash::SaltString::generate(&mut rand_core::OsRng);
    let argon2 = argon2::Argon2::default();
    let password_hash = match argon2.hash_password(password.as_bytes(), &salt) {
        Ok(val) => val,
        Err(err) => {
            println!("Failed to hash password.");
            println!("{}", err);
            panic!();
        }
    };

    password_hash.to_string()
}

async fn update_password(
    new_hashed_password: String,
    pool: &Pool<Postgres>
) {
    let res = sqlx::query(
        r#"
        UPDATE users
        SET password_hash = $1
        WHERE role = 0
        "#
    )
        .bind(new_hashed_password)
        .execute(pool)
        .await;
    
    match res {
        Ok(val) => val,
        Err(err) => {
            println!("Failed to update password.");
            println!("{}.", err.to_string());
            panic!();
        }
    };
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let db_user = match var("DATABASE_USER") {
        Ok(val) => val,
        Err(_err) => {
            panic!("Missing DATABASE_USER key in env.");
        }
    };
    let db_password = match var("DATABASE_PASSWORD") {
        Ok(val) => val,
        Err(_err) => {
            panic!("Missing DATABASE_PASSWORD key in env.");
        }
    };
    let db_host = match var("DATABASE_HOST") {
        Ok(val) => val,
        Err(_err) => {
            panic!("Missing DATABASE_HOST key in env.");
        }
    };
    let db_name = match var("DATABASE_NAME") {
        Ok(val) => val,
        Err(_err) => {
            panic!("Missing DATABASE_NAME key in env.");
        }
    };
    let db_pool = pool(db_user, db_password, db_host, db_name).await;
    let mut username = String::new();
    let mut new_password = String::new();
    let mut new_password_repeat = String::new();
    let mut i = 0;

    io::stdout().flush().unwrap();

    print!("Enter a username that want to reset password: ");

    io::stdout().flush().unwrap();
    io::stdin().read_line(&mut username).unwrap();

    let exist = is_username_exist(username.trim().to_string(), &db_pool).await;

    if ! exist {
        println!("\x1b[31mUsername not exist.\x1b[0m");
        
        process::exit(2);
    }

    while new_password.len() == 0 {
        if i > 0 {
            println!("\x1b[31m\nNew password can't be empty.\x1b[0m");
        }

        print!("Enter your new password: ");
        io::stdout().flush().unwrap();
        io::stdin().read_line(&mut new_password).unwrap();

        if new_password.len() == 1 {
            new_password = String::new();
        }

        i = i + 1;
    }

    i = 0;
    while new_password_repeat.len() == 0 {
        if i > 0 {
            println!("\x1b[31m\nRepeat new password can't be empty.\x1b[0m");
        }

        print!("Repeat new password: ");
        io::stdout().flush().unwrap();
        io::stdin().read_line(&mut new_password_repeat).unwrap();

        if new_password_repeat.len() == 1 {
            new_password_repeat = String::new();
        }

        i = i + 1;
    }

    while new_password.ne(&new_password_repeat) {
        print!("\x1b[2J\x1b[H");
        io::stdout().flush().unwrap();

        println!("Password doesn't match.");
        println!("\x1b[31mPassword doesn't match. Re-enter the password again.\n\x1b[0m");
        io::stdout().flush().unwrap();

        new_password = String::new();
        new_password_repeat = String::new();

        i = 0;
        while new_password.len() == 0 {
            if i > 0 {
                println!("\x1b[31m\nNew password can't be empty.\x1b[0m");
            }

            print!("Enter your new password: ");
            io::stdout().flush().unwrap();
            io::stdin().read_line(&mut new_password).unwrap();

            if new_password.len() == 1 {
                new_password = String::new();
            }

            i = i + 1;
        }

        i = 0;
        while new_password_repeat.len() == 0 {
            if i > 0 {
                println!("\x1b[31m\nRepeat new password can't be empty.\x1b[0m");
            }

            print!("Repeat new password: ");
            io::stdout().flush().unwrap();
            io::stdin().read_line(&mut new_password_repeat).unwrap();

            if new_password_repeat.len() == 1 {
                new_password_repeat = String::new();
            }

            i = i + 1;
        }
    }

    let trimmed_password = new_password.trim();
    let hashed_password = hash_passowrd(&trimmed_password.to_string());

    update_password(hashed_password, &db_pool).await;

    println!("\x1b[32m\nSuccessfully reset the password.\x1b[0m");
}
