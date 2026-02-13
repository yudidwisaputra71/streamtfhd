'use strict';

export class Forbidden extends Error {
    constructor(message) {
        super(message);
        this.name = "ForbiddenError";
    }
}