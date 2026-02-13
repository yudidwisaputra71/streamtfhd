'use strict';

export class SettingsModel {
    #config = null;

    constructor(config) {
        this.#config = config;
    }

    async profileImageUpload(formData, jwt) {
        let res = null;
        let url = this.#config.HTTP_BACKEND_URL + "/settings/profile/image-upload";

        try {
            res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                },
                body: formData,
            });
        } catch (err) {
            throw err;
        }

        return res;
    }

    async profileSettingsGet(jwt) {
        let res = null;
        let url = this.#config.HTTP_BACKEND_URL + "/settings/profile/get";

        try {
            res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
        } catch (err) {
            throw err;
        }

        return res;
    }

    async updateProfile(avatar, username, jwt) {
        let res = null;
        let url = this.#config.HTTP_BACKEND_URL + "/settings/profile/post";

        try {
            res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    avatar: avatar,
                    username: username
                })
            });
        } catch (err) {
            throw err;
        }

        return res;
    }

    async updatePassword(
        currentPassword,
        newPassword,
        confirmPassword,
        jwt) {
        let res = null;
        let url = this.#config.HTTP_BACKEND_URL + "/settings/security";

        try {
            res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                })
            });
        } catch (err) {
            throw err;
        }

        return res;
    }

    async getLog(last_n_lines, jwt) {
        let res = null;
        let url = this.#config.HTTP_BACKEND_URL + "/settings/logs/read/" + last_n_lines;

        try {
            res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
        } catch (err) {
            throw err;
        }

        return res;
    }

    async searchLog(controllerSignal, query, jwt) {
        let res = null;
        const encodedQuery = encodeURIComponent(query);
        let url = this.#config.HTTP_BACKEND_URL + "/settings/logs/search?query=" + encodedQuery;

        try {
            res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                },
                signal: controllerSignal
            });
        } catch (err) {
            throw err;
        }

        return res;
    }

    async clearLogs(jwt) {
        let res = null;
        let url = this.#config.HTTP_BACKEND_URL + "/settings/logs/clear";

        try {
            res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
        } catch (err) {
            throw err;
        }

        return res;
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