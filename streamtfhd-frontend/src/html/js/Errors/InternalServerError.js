'use strict';

export class InternalServerError extends Error {
    constructor(message, response) {
        super(message);
        this.name = "InternalServerError";
        this.response = response;
    }
}