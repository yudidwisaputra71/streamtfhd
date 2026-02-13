'use strict';

import { BadRequest } from "../Errors/BadRequest.js";
import { Http } from "../Errors/Http.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { Network } from "../Errors/Network.js";
import { SetupAccountViewModel } from "../ViewModel/SetupAccountViewModel.js";

export class SetupAccountView {
    #config = null;
    #viewModel = null;
    #profileImage = null;

    constructor(config) {
        this.#config = config;
        this.#viewModel = new SetupAccountViewModel(this.#config);

        this.#setupAccountCheck();

        this.#imageUploadListener();
        this.#hideAndShowPasswordListener();
        this.#hideAndShowRepeatPasswordListener();
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

        if (res.check === false) {
            window.location.href = "/login";
        }
    }

    async #imageUploadListener() {
        const fileInput = document.getElementById('setupAccountPhotoProfileImageUpload');

        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];

            this.alertClose();
            
            if (!file) {
                return;
            }

            // (Optional) Validate type again (important)
            const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                this.alertDanger("Only PNG, JPG, and GIF are allowed");

                fileInput.value = '';
                return;
            }

            // Create FormData
            const formData = new FormData();
            formData.append('image', file);

            let ret = null;

            try {
                ret = await this.#viewModel.imageUpload(formData);
            } catch (error) {
                if (error instanceof InternalServerError) {
                    this.alertDanger(error.response.error + ".");
                } else if (error instanceof BadRequest) {
                    console.log(error.response.error);
                    this.alertDanger(error.response.error + ".");
                } else if (error instanceof Http) {
                    this.alertDanger(error.response.error + ".");
                } else if (error instanceof Network) {
                    this.alertDanger(error.message + ".");
                } else {
                    this.alertDanger("Error.");
                }
            }

            document.querySelector('#profileImage').src = this.#config.HTTP_BACKEND_URL + "/uploads/images?file=" + ret.image;

            this.#profileImage = ret.image;
        });
    }

    async submit() {
        const isValid = this.#validation();

        if (isValid) {
            this.addUser();
        }
    }

    async addUser() {
        const avatar = this.#profileImage;
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const repeatPassword = document.getElementById("repeatPassword").value;

        this.alertClose();

        let res = null;

        try {
            res = await this.#viewModel.addUser(
                avatar,
                username,
                password,
                repeatPassword
            );

            if (res.response === true) {
                this.alertSuccess("Successfully register user. Please wait... You will redirected to the login page.");

                await this.sleep(2000);

                window.location.replace('/login');
            }
        } catch(error) {
            if (error instanceof BadRequest) {
                const username = document.getElementById("username");
                const password = document.getElementById("password");
                const repeatPassword = document.getElementById("repeatPassword");

                const usernameError = document.getElementById("usernameError");
                const passwordError = document.getElementById("passwordError");
                const repeatPasswordError = document.getElementById("repeatPasswordError");
                const passwordDoesntMatchError = document.getElementById("passwordDoesntMatchError");

                if (error.response.error === "Username is empty") {
                    username.classList.add("is-invalid");
                    usernameError.classList.add("d-block");
                } else if (error.response.error === "Password is empty") {
                    password.classList.add("is-invalid");
                    passwordError.classList.add("d-block");
                } else if (error.response.error === "Repeat password is empty") {
                    repeatPassword.classList.add("is-invalid");
                    repeatPasswordError.classList.add("d-block");
                } else if (error.response.error === "Password doesn't match") {
                    repeatPassword.classList.add("is-invalid");
                    passwordDoesntMatchError.classList.add("d-block");
                } else {
                    this.alertDanger(error.response.error + ".");
                }
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".");
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".");
            } else {
                this.alertDanger("Unknown error.");
            }
        }
    }

    #validation() {
        let valid = true;

        const username = document.getElementById("username");
        const password = document.getElementById("password");
        const repeatPassword = document.getElementById("repeatPassword");

        const usernameError = document.getElementById("usernameError");
        const passwordError = document.getElementById("passwordError");
        const repeatPasswordError = document.getElementById("repeatPasswordError");
        const passwordDoesntMatchError = document.getElementById("passwordDoesntMatchError");

        username.classList.remove("is-invalid");
        password.classList.remove("is-invalid");
        repeatPassword.classList.remove("is-invalid");
        passwordDoesntMatchError.classList.remove("is-invalid");

        usernameError.classList.remove("d-block");
        passwordError.classList.remove("d-block");
        repeatPasswordError.classList.remove("d-block");
        passwordDoesntMatchError.classList.remove("d-block");

        if (username.value === "") {
            username.classList.add("is-invalid");
            usernameError.classList.add("d-block");

            valid = false;
        }

        if (password.value === "") {
            password.classList.add("is-invalid");
            passwordError.classList.add("d-block");

            valid = false;
        }

        if (repeatPassword.value === "") {
            repeatPassword.classList.add("is-invalid");
            repeatPasswordError.classList.add("d-block");

            valid = false;
        }

        if (password.value != repeatPassword.value) {
            passwordDoesntMatchError.classList.add("is-invalid");
            passwordDoesntMatchError.classList.add("d-block");
        }

        if (!valid) {
            return false;
        }

        return true;
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

    #hideAndShowRepeatPasswordListener() {
        const passwordInput = document.getElementById('repeatPassword');
        const toggleBtn = document.getElementById('toggleRepeatPassword');

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