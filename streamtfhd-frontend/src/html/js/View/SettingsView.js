'use strict';

import { BadRequest } from "../Errors/BadRequest.js";
import { Http } from "../Errors/Http.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { Network } from "../Errors/Network.js";
import { SettingsViewModel } from "../ViewModel/SettingsViewModel.js";
import { User } from "../Utils/User.js";
import { Unauthorized } from "../Errors/Unauthorized.js";

export class SettingsView {
    #config = null;
    #viewModel = null;

    #avatar = null;
    #lastAvatar = null;
    #lastUsername = null;

    #logLiveSearchController;

    constructor(config) {
        this.#config = config;
        this.#viewModel = new SettingsViewModel(this.#config);

        this.#checkCredentials();

        this.#setAvatar();

        this.#loadLogsWhenLogsTabActive();

        this.#logLiveSearch();

        this.#profileSettingsGet();
        this.#profileImageUploadListener();
        this.#logLooper();
    }

    async #checkCredentials() {
        let cred = null;

        try {
            cred = await User.checkCredentials();
        } catch (error) {
            if (error instanceof Network) {
                this.alertDanger("Failed to check credentials.");
            } else {
                this.alertDanger("Failed to check credentials.");
            }
        }

        if (cred !== null && cred === false) {
            const redirecTo = encodeURIComponent("/settings");

            window.location.href = "/login?redirect_to=" + redirecTo;
        } else {
            document.getElementById('body').style.display = 'block';
        }
    }

    async #setAvatar() {
        const avatarImg = document.getElementById("sidebarAvatar");
        const avatar = await this.#getAvatar();

        if (avatar !== null) {
            avatarImg.src = this.#config.HTTP_BACKEND_URL + "/uploads/images?file=" + avatar;
        }
    }

    async #getAvatar() {
        let res = null;

        try {
            res = await this.#viewModel.getAvatar();
        } catch (error) {
            if (error instanceof Network) {
                this.alertDanger("Network error.");
            } else if (error instanceof Unauthorized) {
                const redirecTo = encodeURIComponent("/gallery");

                window.location.href = "/login?redirect_to=" + redirecTo;
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".");
            } else {
                this.alertDanger("Unknown error.");
            }

            return null;
        }

        return res.avatar;
    }

    async clearLogs() {
        let res = null;

        this.alertCloseLogs();

        try {
            res = await this.#viewModel.clearLogs();
        } catch (error) {
            if (error instanceof Network) {
                this.alertDangerLogs("Failed to connect to backend.");
            } else if (error instanceof Unauthorized) {
                const redirecTo = encodeURIComponent("/settings");

                window.location.href = "/login?redirect_to=" + redirecTo;
            } else if (error instanceof InternalServerError) {
                this.alertDangerLogs(error.response.error + ".");
            } else if (error instanceof Http) {
                this.alertDangerLogs(error.response.error + ".");
            } else {
                this.alertDangerLogs("Unknown error.");
            }

            return;
        }

        if(res.clear_logs === true) {
            const clearLogsModal = document.getElementById("clearLogsModal");
            const modal = bootstrap.Modal.getInstance(clearLogsModal);
            const logContainer = document.getElementById("logContainer");

            modal.hide();

            this.alertSuccessLogs("Logs was cleared.");

            logContainer.replaceChildren();
        } else {
            this.alertDangerLogs("Clear logs failed.");
        }
    }

    #logLiveSearchDebounce(fn, delay = 500) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    async #logLiveSearch() {
        const input = document.getElementById('searchLog');
        const logContainer = document.getElementById("logContainer");

        const search = this.#logLiveSearchDebounce(async (query) => {
            let res = null;

            if (this.#logLiveSearchController) {
                this.#logLiveSearchController.abort();
            }
            
            this.#logLiveSearchController = new AbortController();

            if (!query.trim()) {
                logContainer.replaceChildren();

                this.#getLog();

                return;
            }

            this.alertCloseLogs();

            try {
                res = await this.#viewModel.searchLog(this.#logLiveSearchController.signal, query);
            } catch (error) {
                if (error instanceof Unauthorized) {
                    const redirecTo = encodeURIComponent("/settings");

                    window.location.href = "/login?redirect_to=" + redirecTo;
                } else if (error instanceof Network) {
                    this.alertDangerLogs(error.message + ".");
                } else if (error instanceof InternalServerError) {
                    this.alertDangerLogs(error.response.error + ".");
                } else if(error instanceof Http) {
                    this.alertDangerLogs(error.response.error + ".");
                } else {
                    this.alertDangerLogs("Unknown error.");
                }

                return;
            }

            logContainer.replaceChildren();
            this.#logLooper(res.data);
        }, 500);

        input.addEventListener('input', (e) => {
            search(e.target.value);
        });
    }

    refreshLogs() {
        const lastLine = document.getElementById("logsLastLine").value;
        const lastLineInt = parseInt(lastLine);

        this.getLogLastLine(lastLineInt);
    }

    #loadLogsWhenLogsTabActive() {
        const logsTab = document.getElementById('logs-tab');

        logsTab.addEventListener('shown.bs.tab', () => {
            this.#getLog();
        });
    }

    getLogLastLine(lines) {
        const lastLineButton = document.getElementById("logsLastLine");

        if (lines < 0 || lines === null || lines === undefined) {
            lines = 100;
        }

        lastLineButton.textContent = "Last " + lines + " lines";
        lastLineButton.value = lines;

        this.#getLog(lines);
    }

    async #getLog(last_n_lines) {
        let ret = null;
        let retData = [];

        if (last_n_lines < 0 || last_n_lines === null || last_n_lines === undefined) {
            last_n_lines = 100;
        }

        this.alertCloseLogs();

        try {
            ret = await this.#viewModel.getLog(last_n_lines);
        } catch (error) {
            if (error instanceof Unauthorized) {
                const redirecTo = encodeURIComponent("/settings");

                window.location.href = "/login?redirect_to=" + redirecTo;
            } else if (error instanceof InternalServerError) {
                this.alertDangerLogs(error.response.error + ".");
            } else if (error instanceof Http) {
                this.alertDangerLogs(error.response.error + ".");
            } else if (error instanceof Network) {
                this.alertDangerLogs("Failed to connect to backend.");
            } else {
                this.alertDangerLogs("Unknown error.");
            }

            return;
        }

        retData = Array.isArray(ret?.data) ? ret.data : [];

        this.#logLooper(retData);
    }

    #logLooper(data) {
        const logContainer = document.getElementById("logContainer");
        const ansi_up = new AnsiUp();

        if (!Array.isArray(data) || data.length === 0) return;

        if (data.length > 0) {
            logContainer.replaceChildren();

            for (let i = 0; i < data.length; i++) {
                logContainer.insertAdjacentHTML(
                    'beforeend',
                    '<div class="log-contents">' +
                        ansi_up.ansi_to_html(data[i]) +
                    '</div>'
                );
            }
        }

        logContainer.scrollTop = logContainer.scrollHeight;
    }

    #updatePasswordValidation() {
        let valid = true;

        const currentPassword = document.getElementById("currentPassword");
        const newPassword = document.getElementById("newPassword");
        const confirmPassword = document.getElementById("confirmPassword");
        const currentPasswordInvalid = document.getElementById("currentPasswordInvalid");
        const newPasswordInvalid = document.getElementById("newPasswordInvalid");
        const confirmPasswordInvalid = document.getElementById("confirmPasswordInvalid");

        currentPassword.classList.remove("is-invalid");
        currentPasswordInvalid.classList.remove("d-block");

        newPassword.classList.remove("is-invalid");
        newPasswordInvalid.classList.remove("d-block");

        confirmPassword.classList.remove("is-invalid");
        confirmPasswordInvalid.classList.remove("d-block");

        if (currentPassword.value === "") {
            currentPassword.classList.add("is-invalid");
            currentPasswordInvalid.classList.add("d-block");

            valid = false;
        }

        if (newPassword.value === "") {
            newPassword.classList.add("is-invalid");
            newPasswordInvalid.classList.add("d-block");

            valid = false;
        }

        if (confirmPassword.value === "") {
            confirmPassword.classList.add("is-invalid");
            confirmPasswordInvalid.classList.add("d-block");

            valid = false;
        }

        return valid;
    }

    submitUpdatePassword() {
        const valid = this.#updatePasswordValidation();

        if (valid) {
            this.#updatePassword();
        }
    }

    async #updatePassword() {
        let res = null;

        const currentPassword = document.getElementById("currentPassword").value;
        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        this.alertCloseUpdatePassword();

        try {
            res = await this.#viewModel.updatePassword(currentPassword, newPassword, confirmPassword);
        } catch (error) {
            if (error instanceof Network) {
                this.alertDangerUpdatePassword(error.message);
            } else if (error instanceof Unauthorized) {
                window.location.href = "/login?redirect_to=/settings";
            } else if (error instanceof InternalServerError) {
                this.alertDangerUpdatePassword(error.response.error + ".");
            } else if (error instanceof Http) {
                this.alertDangerUpdatePassword(error.response.error + ".");
            } else if (error instanceof BadRequest) {
                this.alertDangerUpdatePassword(error.response.error + ".");
            } else {
                this.alertDangerUpdatePassword("Unknown error.");
            }

            return;
        }

        if (res.response === true) {
            this.alertSuccessUpdatePassword(res.message);
        } else {
            this.alertDangerUpdatePassword(res.message);
        }
    }

    #updateProfileValidation() {
        let valid = false;
        let username = document.getElementById("username");
        let usernameInvalid = document.getElementById("usernameInvalid");

        username.classList.remove("is-invalid");
        usernameInvalid.classList.remove("d-block");

        if (username.value === "") {
            username.classList.add("is-invalid");
            usernameInvalid.classList.add("d-block");
        } else {
            valid = true;
        }

        return valid;
    }

    submitUpdateProfile() {
        const valid = this.#updateProfileValidation();

        if (valid) {
            this.#updateProfile();
        }
    }

    async #updateProfile() {
        let ret = null;
        const username = document.getElementById("username").value;
        const avatar = this.#avatar === null ? this.#lastAvatar : this.#avatar;

        this.alertCloseUpdateProfile();

        try {
            ret = await this.#viewModel.updateProfile(avatar, username);
        } catch (error) {
            if (error instanceof Unauthorized) {
                window.location.href = "/login?redirect_to=/settings";
            } else if (error instanceof InternalServerError) {
                this.alertDangerUpdateProfile(error.response.error + ".");
            } else if (error instanceof Network) {
                this.alertDangerUpdateProfile(error.message + ".");
            } else if (error instanceof Http) {
                this.alertDangerUpdateProfile(error.response.error + ".");
            } else if (error instanceof BadRequest) {
                this.alertDangerUpdateProfile(error.response.error + ".");
            } else {
                this.alertDangerUpdateProfile("Unknown error.");
            }

            return;
        }

        if (ret.response === true) {
            this.alertSuccessUpdateProfile("Successfully update profile.");

            if (username !== this.#lastUsername) {
                localStorage.removeItem("jwt");
                window.location.href = "/login?redirect_to=/settings";
            }
        } else {
            this.alertDanger(ret.message + ".");
        }
    }

    async #profileSettingsGet() {
        let ret = null;

        this.alertCloseUpdateProfile();

        try {
            ret = await this.#viewModel.profileSettingsGet();
        } catch (error) {
            if (error instanceof InternalServerError) {
                this.alertDangerUpdateProfile(error.response.error + ".");
            } else if (error instanceof Network) {
                this.alertDangerUpdateProfile(error.message + ".");
            } else if (error instanceof Unauthorized) {
                window.location.href = "/login?redirect_to=/settings";
            } else if (error instanceof Http) {
                this.alertDangerUpdateProfile(error.response.error + ".");
            } else {
                this.alertDangerUpdateProfile("Unknown error");
            }

            return;
        }

        if (ret.response === true) {
            const avatar = document.getElementById("avatar");
            const username = document.getElementById("username");

            if (ret.data.avatar !== null) {
                avatar.src = this.#config.HTTP_BACKEND_URL + "/uploads/images?file=" + ret.data.avatar;
            }

            username.value = ret.data.username;

            this.#lastAvatar = ret.data.avatar;
            this.#lastUsername = ret.data.username;
        }
    }

    showCheckCredentialsNetworkErrorToast() {
        const toastEl = document.getElementById('checkCredentialNetworkErrorToast');
        const toast = new bootstrap.Toast(toastEl, { autohide: false });
        
        toast.show();
    }

    async #profileImageUploadListener() {
        const fileInput = document.getElementById('profileImageUpload');

        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];

            this.alertCloseUpdateProfile()
            
            if (!file) {
                return;
            }

            // (Optional) Validate type again (important)
            const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                this.alertDangerUpdateProfile("Only PNG, JPG, and GIF are allowed");

                fileInput.value = '';
                return;
            }

            // Create FormData
            const formData = new FormData();
            formData.append('image', file);

            let ret = null;

            try {
                ret = await this.#viewModel.profileImageUpload(formData);
            } catch (error) {
                if (error instanceof InternalServerError) {
                    this.alertDangerUpdateProfile(error.response.error + ".");
                } else if (error instanceof BadRequest) {
                    this.alertDangerUpdateProfile(error.response.error + ".");
                } else if (error instanceof Http) {
                    this.alertDangerUpdateProfile(error.response.error + ".");
                } else if (error instanceof Network) {
                    this.alertDangerUpdateProfile(error.message + ".");
                } else if (error instanceof Unauthorized) {
                    window.location.href = "/login?redirect_to=/settings";
                } else {
                    this.alertDangerUpdateProfile("Unknown error.");
                }

                return;
            }

            document.querySelector('#avatar').src = this.#config.HTTP_BACKEND_URL + "/uploads/images?file=" + ret.data.image;

            this.#avatar = ret.data.image;
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

    alertDangerUpdateProfile(message) {
        const alert = '<div id="alert" class="alert alert-danger-custom alert-dismissible fade show" role="alert">' +
                            message +
                            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                        '</div>';
        
        document.getElementById("alertContainerUpdateProfile").insertAdjacentHTML("beforeend", alert);
    }

    alertSuccessUpdateProfile(message) {
        const alert = '<div id="alert" class="alert alert-success-custom alert-dismissible fade show" role="alert">' +
                            message +
                            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                        '</div>';
        
        document.getElementById("alertContainerUpdateProfile").insertAdjacentHTML("beforeend", alert);
    }

    alertCloseUpdateProfile() {
        const alertElement = document.getElementById('alert');

        if (alertElement !== null) {
            const alertInstance = bootstrap.Alert.getOrCreateInstance(alertElement);
            alertInstance.close();
        }
    }

    alertDangerUpdatePassword(message) {
        const alert = '<div id="alert" class="alert alert-danger-custom alert-dismissible fade show" role="alert">' +
                            message +
                            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                        '</div>';
        
        document.getElementById("alertContainerUpdatePassword").insertAdjacentHTML("beforeend", alert);
    }

    alertSuccessUpdatePassword(message) {
        const alert = '<div id="alert" class="alert alert-success-custom alert-dismissible fade show" role="alert">' +
                            message +
                            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                        '</div>';
        
        document.getElementById("alertContainerUpdatePassword").insertAdjacentHTML("beforeend", alert);
    }

    alertCloseUpdatePassword() {
        const alertElement = document.getElementById('alert');

        if (alertElement !== null) {
            const alertInstance = bootstrap.Alert.getOrCreateInstance(alertElement);
            alertInstance.close();
        }
    }

    alertDangerLogs(message) {
        const alert = '<div id="alert" class="alert alert-danger-custom alert-dismissible fade show" role="alert">' +
                            message +
                            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                        '</div>';
        
        document.getElementById("alertContainerLogs").insertAdjacentHTML("beforeend", alert);
    }

    alertSuccessLogs(message) {
        const alert = '<div id="alert" class="alert alert-success-custom alert-dismissible fade show" role="alert">' +
                            message +
                            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                        '</div>';
        
        document.getElementById("alertContainerLogs").insertAdjacentHTML("beforeend", alert);
    }

    alertCloseLogs() {
        const alertElement = document.getElementById('alert');

        if (alertElement !== null) {
            const alertInstance = bootstrap.Alert.getOrCreateInstance(alertElement);
            alertInstance.close();
        }
    }
}