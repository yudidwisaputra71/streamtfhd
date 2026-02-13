'use strict';

import { Forbidden } from "../Errors/Forbidden.js";
import { Http } from "../Errors/Http.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { Network } from "../Errors/Network.js";
import { Unauthorized } from "../Errors/Unauthorized.js";
import { HistoryModel } from "../Model/HistoryModel.js";

export class HistoryViewModel {
    #config = null;
    #model = null;

    constructor(config) {
        this.#config = config;
        this.#model = new HistoryModel(this.#config);
    }

    async getHistory() {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.getHistory(jwt);
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
    
    async deleteHistory(id) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.deleteHistory(id, jwt)
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
        } else if (ret.status === 403) {
            throw new Forbidden("You don't have credentials to do this action.");
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }

    async searchHistory(controllerSignal, keyword) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.searchHistory(controllerSignal, keyword, jwt);
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

    async deleteHistoryAll() {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.deleteHistoryAll(jwt);
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
        }  else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 500) {
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