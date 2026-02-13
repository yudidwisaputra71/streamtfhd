'use strict';

export class Http extends Error {
    constructor(message, response) {
        super(message);
        this.name = "HttpError";
        this.response = response;
    }
}