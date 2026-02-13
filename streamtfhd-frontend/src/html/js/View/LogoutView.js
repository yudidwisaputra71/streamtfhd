'use strict';

export class LogoutView {
    constructor() {
        this.#logout();
    }

    async #logout() {
        localStorage.removeItem("jwt");

        await this.sleep(2000);

        window.location.href = "/login";
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}