'use strict';

import { BadRequest } from "../Errors/BadRequest.js";
import { Http } from "../Errors/Http.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { Network } from "../Errors/Network.js";
import { Unauthorized } from "../Errors/Unauthorized.js";
import { SettingsModel } from "../Model/SettingsModel.js";

export class SettingsViewModel {
    #config = null;
    #model = null;

    constructor(config) {
        this.#config = config;
        this.#model = new SettingsModel(this.#config);
    }

    async profileImageUpload(formData) {
        let ret = null;
        const jwt = localStorage.getItem("jwt");

        if (jwt === null) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        }

        try {
            ret = await this.#model.profileImageUpload(formData, jwt);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Network("Failed to connect to backend.");
            } else {
                throw error;
            }
        }

        let resJson = await ret.json();

        if (ret.status === 200) {
            return resJson;
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error", resJson);
        } else if (ret.status === 400) {
            throw new BadRequest("Bad request", resJson);
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else {
            throw new Http("HTTP error", resJson);
        }
    }

    async profileSettingsGet() {
        let ret = null;
        const jwt = localStorage.getItem("jwt");

        try {
            ret = await this.#model.profileSettingsGet(jwt);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Network("Failed to connect to backend.");
            } else {
                throw error;
            }
        }

        let resJson = await ret.json();

        if (ret.status === 200) {
            return resJson;
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }

    async updateProfile(avatar, username) {
        let ret = null;
        const jwt = localStorage.getItem("jwt");

        if (jwt === null) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        }

        try {
            ret = await this.#model.updateProfile(avatar, username, jwt);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Network("Failed to connect to backend.");
            } else {
                throw error;
            }
        }

        let resJson = await ret.json();

        if (ret.status === 200) {
            return resJson;
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 400) {
            throw new BadRequest("Bad request.", resJson);
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }

    async updatePassword(
        currentPassword,
        newPassword,
        confirmPassword,
    ) {
        let ret = null;
        const jwt = localStorage.getItem("jwt");

        if (jwt === null) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        }

        try {
            ret = await this.#model.updatePassword(currentPassword, newPassword, confirmPassword, jwt);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Network("Failed to connect to backend.");
            } else {
                throw error;
            }
        }

        let resJson = await ret.json();

        if (ret.status === 200) {
            return resJson;
        } else if (ret.status === 401) {
            throw new Unauthorized();
        } else if (ret.status === 400) {
            throw new BadRequest("Bad request.", resJson);
        } else if (ret.status === 500) {
            //console.log(resJson);
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }

    async getLog(last_n_lines) {
        let res = null;
        const jwt = localStorage.getItem("jwt");

        if (jwt === null) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        }

        if (last_n_lines === null) {
            last_n_lines = 100;
        }

        try {
            res = await this.#model.getLog(last_n_lines, jwt);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Network("Failed to connect to backend.");
            } else {
                throw error;
            }
        }

        let resJson = await res.json();

        if (res.status === 200) {
            return resJson;
        } else if (res.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (res.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }

    async searchLog(controllerSignal, query) {
        let res = null;
        const jwt = localStorage.getItem("jwt");

        if (jwt === null) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        }

        try {
            res = await this.#model.searchLog(controllerSignal, query, jwt);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Network("Failed to connect to backend.");
            } else {
                throw error;
            }
        }

        let resJson = await res.json();

        if (res.status === 200) {
            return resJson;
        } else if (res.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (res.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }

    async clearLogs() {
        let res = null;
        const jwt = localStorage.getItem("jwt");

        if (jwt === null) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        }

        try {
            res = await this.#model.clearLogs(jwt);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Network("Failed to connect to backend.");
            } else {
                throw error;
            }
        }

        let resJson = await res.json();

        if (res.status === 200) {
            return resJson;
        } else if (res.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (res.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }

    async getAvatar() {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.getAvatar(jwt);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Network("Failed to connect to backend.");
            } else {
                throw error;
            }
        }

        let resJson = await ret.json();
        
        if (ret.status === 200) {
            return resJson;
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }
}