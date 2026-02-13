'use strict';

import { BadRequest } from "../Errors/BadRequest.js";
import { Http } from "../Errors/Http.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { Network } from "../Errors/Network.js";
import { Unauthorized } from "../Errors/Unauthorized.js";
import { Forbidden } from "../Errors/Forbidden.js";
import { IndexModel } from "../Model/IndexModel.js";

export class IndexViewModel {
    #config = null;
    #model = null;

    constructor(config) {
        this.#config = config;
        this.#model = new IndexModel(this.#config);
    }

    dashboardMetricsWS() {
        return this.#model.dashboardMetricsWS();
    }

    async getVideosChooseVideo() {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.getVideosChooseVideo(jwt);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Network("Network error.");
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

    async searchVideoChooseVideo(signal, keyword) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.searchVideoChooseVideo(signal, keyword, jwt);
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

    async createStream(data) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.createStream(data, jwt);
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
        } else if (ret.status === 400) {
            throw new BadRequest("Bad request.", resJson);
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }

    async getLiveStreams() {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.getLiveStreams(jwt);
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
        } else if (ret.status === 400) {
            throw new BadRequest("Bad request.", resJson);
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }
    
    async deleteStream(id) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.deleteStream(id, jwt);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Network("Failed to connect to backend.");
            } else {
                throw error;
            }
        }

        if (ret.status === 200) {
            let resJson = await ret.json();

            return resJson;
        } else if (ret.status === 400) {
            let resJson = await ret.json();

            throw new BadRequest("Bad request.", resJson);
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 403) {
            throw new Forbidden("You don't have credentials to do this action.");
        } else if (ret.status === 500) {
            let resJson = await ret.json();

            throw new InternalServerError("Internal server error.", resJson);
        } else {
            let resJson = await ret.json();

            throw new Http("HTTP error", resJson);
        }
    }

    async editStreamGet(id) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.editStreamGet(id, jwt);
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
        } else if (ret.status === 403) {
            throw new Forbidden("You don't have credentials to get this data.");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }

    async editStreamPost(data) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.editStreamPost(data, jwt);
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
        } else if (ret.status === 400) {
            throw new BadRequest("Bad request.", resJson);
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 403) {
            throw new Forbidden("You don't have credentials to get this data.");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error.", resJson);
        }
    }

    async searchStream(controllerSignal, keyword) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.searchStream(controllerSignal, keyword, jwt);
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
        } else if (ret.status === 400) {
            throw new BadRequest("Bad request.", resJson);
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error.", resJson);
        }
    }

    liveStreamMonitorWS() {
        return this.#model.liveStreamMonitorWS();
    }

    async startStream(id) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.startStream(id, jwt);
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
        } else if (ret.status === 400) {
            throw new BadRequest("Bad request.", resJson);
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 403) {
            throw new Forbidden("You don't have credentials to do this action.");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error.", resJson);
        }
    }

    async stopStream(id) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.stopStream(id, jwt);
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
        } else if (ret.status === 400) {
            throw new BadRequest("Bad request.", resJson);
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 403) {
            throw new Forbidden("You don't have credentials to do this action.");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error.", resJson);
        }
    }

    async cancelStream(id) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.cancelStream(id, jwt);
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
        } else if (ret.status === 400) {
            throw new BadRequest("Bad request.", resJson);
        } else if (ret.status === 401) {
            throw new Unauthorized("You don't have credentials to access this endpoint.");
        } else if (ret.status === 403) {
            throw new Forbidden("You don't have credentials to do this action.");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error.", resJson);
        }
    }

    async getServerTime() {
        let ret = null;

        try {
            ret = await this.#model.getServerTime();
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
        }else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error.", resJson);
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