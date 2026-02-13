'use strict';

export class HistoryModel {
    #config = null;

    constructor(config) {
        this.#config = config;
    }

    async getHistory(jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/history/get";

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

    async deleteHistory(id, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/history/delete/" + id;

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

    async searchHistory(controllerSignal, keyword, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/history/search?keyword=" + keyword;

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

    async deleteHistoryAll(jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/history/delete-all";

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