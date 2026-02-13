'use strict';

export class Unauthorized extends Error {
    constructor(message, response) {
        super(message);
        this.name = "Unauthorized";
        this.response = response;
    }
}