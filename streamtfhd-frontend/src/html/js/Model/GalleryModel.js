'use strict';

import { Http } from "../Errors/Http.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { Network } from "../Errors/Network.js";
import { Unauthorized } from "../Errors/Unauthorized.js";

export class GalleryModel {
    #config = null;

    constructor(config) {
        this.#config = config;
    }

    uploadVideo(xhr, formData, jwt) {
        const url = this.#config.HTTP_BACKEND_URL + "/gallery/upload-video";

        return new Promise((resolve, reject) => {
            xhr.open("POST", url);
            xhr.setRequestHeader('Authorization', 'Bearer ' + jwt);

            xhr.onload = () => {
                try {
                    const resJson = JSON.parse(xhr.responseText);

                    if (xhr.status === 200) {
                        resolve(resJson);
                    } else if (xhr.status === 401) {
                        reject(new Unauthorized("Unauthorized", resJson));
                    } else if (xhr.status === 500) {
                        reject(new InternalServerError("Internal server error", resJson));
                    } else {
                        reject(new Http("HTTP error", resJson));
                    }
                } catch (err) {
                    reject(err);
                }
            };

            xhr.onerror = () => {
                reject(new Network("Failed to connect to backend."));
            };

            xhr.send(formData);
        });
    }

    async getVideos(page, pageSize, order, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/gallery/get-videos/" + page + "/" + pageSize + "/" + order;

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

    async renameVideo(videoId, newVideoName, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/gallery/rename-video?video_id=" + videoId + "&new_video_name=" + newVideoName;

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

    async deleteVideo(videoId, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/gallery/delete-video/" + videoId;

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

    async deleteAllVideos(jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/gallery/delete-all-videos";

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

    async searchVideo(controllerSignal, keyword, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/gallery/search-video?keyword=" + keyword;

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

    async importFromDrive(googleDriveUrl, jwt) {
        let ret = null;
        const url = this.#config.HTTP_BACKEND_URL + "/gallery/import-from-drive?google_drive_url=" + googleDriveUrl;

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