'use strict';

// Edit these lines.
const base_config = {
    HTTP_PROTOCOL       : "http://",                // HTTP protocol.
    WEBSOCKET_PROTOCOL  : "ws://",                  // Websocket protocol.
    BACKEND_HOST        : "your-backend-host",      // Backend host.
    BACKEND_PORT        : 80,                       // Backend port.
    BACKEND_PATH        : null,                     // Backend path. Fill it with null if you don't use backend path.
};

// Don't touch these lines.
const config = {
    HTTP_PROTOCOL           : base_config.HTTP_PROTOCOL,
    WEBSOCKET_PROTOCOL      : base_config.WEBSOCKET_PROTOCOL,
    BACKEND_HOST            : base_config.BACKEND_HOST,
    BACKEND_PORT            : base_config.BACKEND_PORT,
    BACKEND_PATH            : base_config.BACKEND_PATH,
    HTTP_BACKEND_URL        : base_config.BACKEND_PATH === null ? base_config.HTTP_PROTOCOL + base_config.BACKEND_HOST + ":" + base_config.BACKEND_PORT : base_config.HTTP_PROTOCOL + base_config.BACKEND_HOST + ":" + base_config.BACKEND_PORT + base_config.BACKEND_PATH,
    WEBSOCKET_BACKEND_URL   : base_config.BACKEND_PATH === null ? base_config.WEBSOCKET_PROTOCOL + base_config.BACKEND_HOST + ":" + base_config.BACKEND_PORT : base_config.WEBSOCKET_PROTOCOL + base_config.BACKEND_HOST + ":" + base_config.BACKEND_PORT + base_config.BACKEND_PATH
};

export default config;