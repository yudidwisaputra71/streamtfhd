'use strict';

export class Conflict extends Error {
    constructor(message, response) {
        super(message);
        this.name = "Conflict";
        this.response = response;
    }
}