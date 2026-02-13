'use strict';

export class IndexModel {
    #config = null;

    constructor(config) {
        this.#config = config;
    }

    dashboardMetricsWS() {
        const url = this.#config.WEBSOCKET_BACKEND_URL + "/websocket-dashboard-metrics";
        const ws = new WebSocket(url);

        return ws;
    }

    async getVideosChooseVideo(jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/live-stream/get-videos";

        try {
            ret = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }

    async searchVideoChooseVideo(signal, keyword, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/live-stream/create-stream/search-video?keyword=" + keyword;

        try {
            ret = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                },
                signal: signal
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }

    async createStream(data, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/live-stream/create-stream";
        const jsonStringify = JSON.stringify(data);

        try {
            ret = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    "Content-Type": "application/json"
                },
                body: jsonStringify
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }

    async getLiveStreams(jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/live-stream/get-live-streams";

        try {
            ret = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }

    async deleteStream(id, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/live-stream/delete-stream/" + id;

        try {
            ret = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }

    async editStreamGet(id, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/live-stream/edit-stream/get/" + id;

        try {
            ret = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }

    async editStreamPost(data, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/live-stream/edit-stream/post";

        try {
            ret = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }

    async searchStream(controllerSignal, keyword, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/live-stream/search-stream?keyword=" + keyword;

        try {
            ret = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                },
                signal: controllerSignal
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }

    liveStreamMonitorWS() {
        const url = this.#config.WEBSOCKET_BACKEND_URL + "/live-stream/monitor";
        const ws = new WebSocket(url);

        return ws;
    }

    async startStream(id, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/live-stream/start/" + id;

        try {
            ret = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }

    async stopStream(id, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/live-stream/stop/" + id;

        try {
            ret = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }

    async cancelStream(id, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/live-stream/cancel/" + id;

        try {
            ret = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }

    async getServerTime() {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/get-server-time";

        try {
            ret = await fetch(url, {
                method: 'GET'
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }

    async getAvatar(jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/get-avatar";

        try {
            ret = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
        } catch (err) {
            throw err;
        }

        return ret;
    }
}