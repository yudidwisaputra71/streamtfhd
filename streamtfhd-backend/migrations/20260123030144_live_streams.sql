-- Add migration script here
CREATE TABLE live_streams (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner               TEXT NOT NULL,
    title               TEXT NOT NULL,
    video               BIGINT NOT NULL,
    rtmp_url            TEXT NOT NULL,
    stream_key          TEXT NOT NULL,
    stream_loop         INTEGER NOT NULL,
    schedule_start      BIGINT,
    schedule_end        BIGINT,
    started_at          BIGINT,
    created_at          BIGINT NOT NULL,

    CONSTRAINT fk_live_stream_user
        FOREIGN KEY (owner)
        REFERENCES users(id),
    
    CONSTRAINT fk_live_stream_video
        FOREIGN KEY (video)
        REFERENCES videos(id)
)