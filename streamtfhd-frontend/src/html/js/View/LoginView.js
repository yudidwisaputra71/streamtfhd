'use strict';

import { Http } from "../Errors/Http.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { Network } from "../Errors/Network.js";
import { Unauthorized } from "../Errors/Unauthorized.js";
import { LoginViewModel } from "../ViewModel/LoginViewModel.js";

export class LoginView {
    #config = null;
    #viewModel = null;

    constructor(config) {
        this.#config = config;
        this.#viewModel = new LoginViewModel(this.#config);

        this.#setupAccountCheck();
        this.#hideAndShowPasswordListener();
        this.#loginFormEnterButtonListener();
    }

    #loginFormEnterButtonListener() {
        document.getElementById("loginForm").addEventListener("submit", (e) => {
            e.preventDefault(); // stop page reload
            this.submit();
        });
    }

    async #setupAccountCheck() {
        let res = null;

        try {
            res = await this.#viewModel.setupAccountCheck();
        } catch (error) {
            if (error instanceof Network) {
                this.alertDanger("Network error.");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".");
            } else {
                this.alertDanger("Unknown error.");
            }
        }

        if (res.check === true) {
            window.location.href = "/setup-account";
        }
    }

    submit() {
        const validation = this.#validation();
        
        if (validation) {
            this.#login();
        }
    }

    async #login() {
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        let login = null;

        this.alertClose();

        try {
            login = await this.#viewModel.login(username, password);
        } catch (error) {
            if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".");
            } else if (error instanceof Unauthorized) {
                this.alertDanger("Invalid username and password combination.");
            } else if (error instanceof Network) {
                this.alertDanger("Network error.");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".");
            } else {
                this.alertDanger("Unknown error.");
            }

            return;
        }

        if (login.response === true && login.login === true) {
            const queryString = window.location.search;
            const urlParams = new URLSearchParams(queryString);
            const redirecTo = urlParams.get("redirect_to");

            localStorage.setItem('jwt', login.data.jwt);
            
            this.alertSuccess("Login success. Please wait, you will be redirected in a few second.");

            await this.sleep(2000);
            
            if (redirecTo === null) {
                window.location.href = "/";
            } else {
                const decodedRedirectTo = decodeURIComponent(redirecTo);
                window.location.href = decodedRedirectTo;
            }
        } else {
            this.alertDanger("Login failed.");
        }
    }

    #validation() {
        let valid = false;

        const username = document.getElementById("username");
        const password = document.getElementById("password");

        const usernameError = document.getElementById("usernameError");
        const passwordError = document.getElementById("passwordError");

        username.classList.remove("is-invalid");
        password.classList.remove("is-invalid");

        usernameError.classList.remove("d-block");
        passwordError.classList.remove("d-block");

        if (username.value === "") {
            username.classList.add("is-invalid");
            usernameError.classList.add("d-block");
        } else if (password.value === "") {
            password.classList.add("is-invalid");
            passwordError.classList.add("d-block");
        } else {
            valid = true;
        }

        return valid;
    }

    #hideAndShowPasswordListener() {
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.getElementById('togglePassword');

        toggleBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';

            passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';

            if (isPassword) {
                toggleBtn.classList.add("ti-eye-off");
                toggleBtn.classList.remove("ti-eye");
            } else {
                toggleBtn.classList.add("ti-eye");
                toggleBtn.classList.remove("ti-eye-off");
            }
        });
    }

    alertDanger(message) {
        const alert = '<div id="alert" class="alert alert-danger-custom alert-dismissible fade show" role="alert">' +
                            message +
                            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                        '</div>';
        
        document.getElementById("alertContainer").insertAdjacentHTML("beforeend", alert);
    }

    alertSuccess(message) {
        const alert = '<div id="alert" class="alert alert-success-custom alert-dismissible fade show" role="alert">' +
                            message +
                            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                        '</div>';
        
        document.getElementById("alertContainer").insertAdjacentHTML("beforeend", alert);
    }

    alertClose() {
        const alertElement = document.getElementById('alert');

        if (alertElement !== null) {
            const alertInstance = bootstrap.Alert.getOrCreateInstance(alertElement);
            alertInstance.close();
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}