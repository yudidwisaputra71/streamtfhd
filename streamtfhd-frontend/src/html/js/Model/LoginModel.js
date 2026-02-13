'use strict';

export class LoginModel {
    #config = null;

    constructor(config) {
        this.#config = config;
    }

    async login(username, password) {
        let res = null;

        try {
            const url = this.#config.HTTP_BACKEND_URL + "/login";

            res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
        } catch(error) {
            throw error;
        }

        return res;
    }

    async setupAccountCheck() {
        let res = null;

        try {
            const url = this.#config.HTTP_BACKEND_URL + "/setup-account/check";

            res = await fetch(url, {
                method: "GET"
            });
        } catch(error) {
            throw error;
        }

        return res;
    }
}