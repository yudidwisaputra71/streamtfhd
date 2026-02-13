-- Add migration script here
CREATE TABLE users (
    id              TEXT PRIMARY KEY UNIQUE NOT NULL,
    avatar          TEXT,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            SMALLINT NOT NULL,
    created_at      INTEGER NOT NULL
);