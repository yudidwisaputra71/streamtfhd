import config from "../config.js";
import { Network } from "../Errors/Network.js";

export class User {
    static async checkCredentials() {
        const accessToken = localStorage.getItem("jwt");

        if (!accessToken) {
            return false;
        }

        try {
            const url = config.HTTP_BACKEND_URL + "/check-credentials";
            const ret = await fetch(url, {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            let retJson = await ret.json();

            return retJson.have_credentials;
        } catch(error) {
            if (error instanceof TypeError) {
                throw new Network("Failed to connect to backend.");
            } else {
                throw error;
            }
        }
    }
}