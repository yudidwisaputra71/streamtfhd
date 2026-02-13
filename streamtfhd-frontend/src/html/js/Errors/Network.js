'use strict';

export class Network extends Error {
    constructor(message) {
        super(message);
        this.name = "NetworkError";
    }
}