'use strict';

import { BadRequest } from "../Errors/BadRequest.js";
import { Forbidden } from "../Errors/Forbidden.js";
import { Http } from "../Errors/Http.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { Network } from "../Errors/Network.js";
import { Unauthorized } from "../Errors/Unauthorized.js";
import { UnprocessableContent } from "../Errors/UnprocessableContent.js";
import { Conflict } from "../Errors/Conflict.js";
import { GalleryModel } from "../Model/GalleryModel.js";

export class GalleryViewModel {
    #config = null;
    #model = null;

    constructor(config) {
        this.#config = config;
        this.#model = new GalleryModel(this.#config);
    }

    async uploadVideo(xhr, formData) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.uploadVideo(xhr, formData, jwt);
        } catch (error) {
            throw error;
        }

        return ret;
    }

    async getVideos(page, pageSize, order) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.getVideos(page, pageSize, order, jwt);
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

    async renameVideo(videoId, newVideoName) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.renameVideo(videoId, newVideoName, jwt);
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
        } else if (ret.status === 403) {
            throw new Forbidden("Forbidden");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }

    async deleteVideo(videoId) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.deleteVideo(videoId, jwt);
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
        } else if (ret.status === 409) {
            throw new Conflict("Conflict.", resJson);
        } else if (ret.status === 403) {
            throw new Forbidden("Forbidden");
        } else if (ret.status === 500) {
            throw new InternalServerError("Internal server error.", resJson);
        } else {
            throw new Http("HTTP error", resJson);
        }
    }

    async deleteAllVideos() {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.deleteAllVideos(jwt);
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

    async searchVideo(controllerSignal, keyword) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.searchVideo(controllerSignal, keyword, jwt);
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

    async importFromDrive(googleDriveUrl) {
        const jwt = localStorage.getItem("jwt");
        let ret = null;

        try {
            ret = await this.#model.importFromDrive(googleDriveUrl, jwt);
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
        } else if (ret.status === 422) {
            throw new UnprocessableContent("Unprocessable Content.", resJson);
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