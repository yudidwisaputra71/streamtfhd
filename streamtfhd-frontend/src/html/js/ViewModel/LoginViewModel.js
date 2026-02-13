'use strict';

import { Http } from "../Errors/Http.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { Network } from "../Errors/Network.js";
import { Unauthorized } from "../Errors/Unauthorized.js";
import { LoginModel } from "../Model/LoginModel.js";

export class LoginViewModel {
    #config = null;
    #model = null;

    constructor(config) {
        this.#config = config;
        this.#model = new LoginModel(this.#config);
    }

    async login(username, password) {
        let ret = null;

        try {
            ret = await this.#model.login(username, password);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Network("Failed to connect to backend");
            } else {
                throw error;
            }
        }

        let resJson = await ret.json();

        if (ret.status === 200) {
            return resJson;
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal Server Error", resJson);
        } else if (ret.status === 401) {
            throw new Unauthorized("Unauthorized", resJson);
        } else {
            throw new Http("HTTP Error", resJson);
        }
    }

    async setupAccountCheck() {
        let ret = null;

        try {
            ret = await this.#model.setupAccountCheck();
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Network("Failed to connect to backend");
            } else {
                throw error;
            }
        }

        let resJson = await ret.json();

        if (ret.status === 200) {
            return resJson;
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal Server Error", resJson);
        } else {
            throw new Http("HTTP Error", resJson);
        }
    }
}