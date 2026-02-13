-- Add migration script here
CREATE TABLE videos (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner                   TEXT NOT NULL,
    title                   TEXT NOT NULL,
    file                    TEXT NOT NULL UNIQUE,
    thumbnail               TEXT NOT NULL,
    width                   INTEGER NOT NULL,
    height                  INTEGER NOT NULL,
    bit_rate                INTEGER NOT NULL,
    frame_rate              INTEGER NOT NULL,
    length                  INTEGER NOT NULL,
    size                    INTEGER NOT NULL,
    uploaded_at             INTEGER NOT NULL,

    CONSTRAINT fk_video_user
        FOREIGN KEY (owner)
        REFERENCES users(id)
);