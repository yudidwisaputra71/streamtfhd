-- Add migration script here
CREATE TABLE live_stream_history (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner                   TEXT NOT NULL,
    live_stream             BIGINT NOT NULL,
    start_time              BIGINT NOT NULL,
    end_time                BIGINT NOT NULL,
    end_status              TEXT NOT NULL,

    CONSTRAINT fk_live_stream_history_user
        FOREIGN KEY (owner)
        REFERENCES users(id)
)