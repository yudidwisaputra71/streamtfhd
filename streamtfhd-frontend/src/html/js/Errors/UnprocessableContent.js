'use strict';

export class UnprocessableContent extends Error {
    constructor(message, response) {
        super(message);
        this.name = "UnprocessableContent";
        this.response = response;
    }
}