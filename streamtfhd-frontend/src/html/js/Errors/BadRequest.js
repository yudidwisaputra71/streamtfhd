'use strict';

export class BadRequest extends Error {
    constructor(message, response) {
        super(message);
        this.name = "BadRequest";
        this.response = response;
    }
}