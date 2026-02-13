'use strict';

import { SetupAccountModel } from "../Model/SetupAccountModel.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { BadRequest } from "../Errors/BadRequest.js";
import { Http } from "../Errors/Http.js";
import { Network } from "../Errors/Network.js";

export class SetupAccountViewModel {
    #config = null;
    #model = null;

    constructor(config) {
        this.#config = config;
        this.#model = new SetupAccountModel(this.#config);
    }

    async addUser(
        avatar,
        username,
        password,
        repeat_password
    ) {
        let ret = null;

        try {
            ret = await this.#model.addUser(
                avatar,
                username,
                password,
                repeat_password
            );
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
        } else if (ret.status === 400) {
            throw new BadRequest("Bad Request", resJson);
        } else {
            throw new Http("HTTP Error", resJson);
        }
    }

    async imageUpload(formData) {
        let ret = null;

        try {
            ret = await this.#model.imageUpload(formData);
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
        } else {
            throw new Http("HTTP error", resJson);
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