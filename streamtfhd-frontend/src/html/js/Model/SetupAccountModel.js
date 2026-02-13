'use strict';

export class SetupAccountModel {
    #config = null;

    constructor(config) {
        this.#config = config;
    }

    async addUser(
        avatar,
        username,
        password,
        repeat_password
    ) {
        let res = null;

        try {
            const url = this.#config.HTTP_BACKEND_URL + "/setup-account";

            res = await fetch(url, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    avatar: avatar,
                    username: username,
                    password: password,
                    repeat_password: repeat_password
                })
            });
        } catch(error) {
            throw error;
        }

        return res;
    }

    async imageUpload(formData) {
        let res = null;
        const url = this.#config.HTTP_BACKEND_URL + "/setup-account/image-upload";

        try {
            res = await fetch(url, {
                method: 'PUT',
                body: formData,
            });
        } catch (err) {
            throw err;
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