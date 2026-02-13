'use strict';

import { HistoryViewModel } from "../ViewModel/HistoryViewModel.js";
import { User } from "../Utils/User.js";
import { Unauthorized } from "../Errors/Unauthorized.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { Http } from "../Errors/Http.js";
import { Forbidden } from "../Errors/Forbidden.js";

export class HistoryView {
    #config = null;
    #viewModel = null;
    #historyData = null;
    #deleteHistoryId = 0;
    #viewOrder = "desc";
    #searchMode = false;
    #searchData = null;
    #historySearchController;

    constructor(config) {
        this.#config = config;
        this.#viewModel = new HistoryViewModel(this.#config);

        this.#checkCredentials();

        this.#setAvatar();

        this.#loadHistoryData();

        this.#historyLiveSearchListener();
    }

    async #checkCredentials() {
        let cred = null;

        this.alertClose();

        try {
            cred = await User.checkCredentials();
        } catch (error) {
            if (error instanceof Network) {
                this.alertDanger("Failed to check credentials. Network error.", "alertContainerHistory");
            } else {
                this.alertDanger("Failed to check credentials. Unknown error.", "alertContainerHistory");
            }
        }

        if (cred !== null && cred === false) {
            const redirecTo = encodeURIComponent("/history");

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
                    this.alertDanger("Network error.", "alertContainerVideoGallery");
                } else if (error instanceof Unauthorized) {
                    const redirecTo = encodeURIComponent("/gallery");
    
                    window.location.href = "/login?redirect_to=" + redirecTo;
                } else if (error instanceof InternalServerError) {
                    this.alertDanger(error.response.error + ".", "alertContainerVideoGallery");
                } else if (error instanceof Http) {
                    this.alertDanger(error.response.error + ".", "alertContainerVideoGallery");
                } else {
                    this.alertDanger("Unknown error.", "alertContainerVideoGallery");
                }
    
                return null;
            }
    
            return res.avatar;
        }

    async deleteHistoryAll() {
        const modalEl = document.getElementById('deleteAllHistoryModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        let res = null;

        this.alertClose();

        try {
            res = await this.#viewModel.deleteHistoryAll();
        } catch (error) {
            if (error instanceof Unauthorized) {
                const redirecTo = encodeURIComponent("/history");

                window.location.href = "/login?redirect_to=" + redirecTo;
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerDeleteAllHistory");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDeleteAllHistory");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDeleteAllHistory");
            } else {
                this.alertDanger("Unknown error.", "alertContainerDeleteAllHistory");
            }

            return;
        }

        if (res.delete_all === true) {
            this.alertSuccess("Successfully delete all live stream history.", "alertContainerHistory");
        } else {
            this.alertDanger("Failed to delete all live stream history.", "alertContainerHistory");
        }

        await this.#getHistory();
        this.#loadHistoryData();
        modal.hide();
    }

    #historyLiveSearchDebounce(fn, delay = 500) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    async #historyLiveSearchListener() {
        const input = document.getElementById("historySearch");

        const search = this.#historyLiveSearchDebounce(async (keyword) => {
            let res = null;

            if (this.#historySearchController) {
                this.#historySearchController.abort();
            }

            this.#historySearchController = new AbortController();

            if (!keyword.trim()) {
                this.#searchMode = false;
                this.#searchData = null;

                await this.#getHistory();
                this.#loadHistoryData();

                return;
            }

            try {
                res = await this.#viewModel.searchHistory(this.#historySearchController.signal, keyword);
            } catch (error) {
                if (error instanceof Unauthorized) {
                    const redirecTo = encodeURIComponent("/history");

                    window.location.href = "/login?redirect_to=" + redirecTo;
                } else if (error instanceof InternalServerError) {
                    this.alertDanger(error.response.error + ".", "alertContainerHistory");
                } else if (error instanceof Http) {
                    this.alertDanger(error.response.error + ".", "alertContainerHistory");
                } else if (error instanceof Network) {
                    this.alertDanger("Failed to connect to backend.", "alertContainerHistory");
                } else {
                    this.alertDanger("Unknown error.", "alertContainerHistory");
                }

                return;
            }

            if (res.response === true) {
                this.#searchData = res.result;

                this.#searchMode = true;
                this.#loadHistoryData();
            } else {
                this.alertDanger("Failed to search history data.", "alertContainerHistory");
            }
            
        }, 500);

        input.addEventListener('input', (e) => {
            search(e.target.value);
        });
    }

    setViewOrder(order) {
        this.#viewOrder = order;
        this.#loadHistoryData();
    }

    async deleteHistory() {
        let res = null;
        const modalEl = document.getElementById('deleteHistoryModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

        this.alertClose();

        try {
            res = await this.#viewModel.deleteHistory(this.#deleteHistoryId);
        } catch (error) {
            if (error instanceof Unauthorized) {
                const redirecTo = encodeURIComponent("/history");

                window.location.href = "/login?redirect_to=" + redirecTo;
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerDeleteHistory");
            } else if (error instanceof Forbidden) {
                this.alertDanger(error.message, "alertContainerDeleteHistory");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDeleteHistory");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDeleteHistory");
            } else {
                this.alertDanger("Unknown error.", "alertContainerDeleteHistory");
            }

            return;
        }

        if (res.delete === true) {
            await this.#getHistory();
            this.#loadHistoryData();
            this.alertSuccess("Live stream history was successfully deleted.", "alertContainerHistory");
        } else {
            this.alertDanger("Failed to delete live stream history.", "alertContainerHistory");
        }

        modal.hide();
    }

    deleteHistoryModal(id) {
        this.#deleteHistoryId = id;

        const modalEl = document.getElementById('deleteHistoryModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

        modal.show();
    }

    async #loadHistoryData() {
        const historyTbody = document.getElementById("historyTbody");

        historyTbody.replaceChildren();

        if (this.#searchMode === false) {
            await this.#getHistory();

            if (this.#historyData.length === 0 || this.#historyData === null) {
                const tr = `<tr>
                                <td colspan="6">
                                    <div class="p-5">
                                        <div class="d-flex align-items-center justify-content-center">
                                            <i class=" h2 ti ti-history"></i>
                                        </div>
                                        <div class="mt-3">
                                            <p class="text-center">No stream history found</p>
                                            <p class="text-center extra-small">Your completed streams will appear here</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>`;
                historyTbody.insertAdjacentHTML("beforeend", tr);
            } else {
                this.#historyLooper(this.#historyData, this.#viewOrder);
            }
        } else {
            this.#historyLooper(this.#searchData, this.#viewOrder);
        }
    }

    #pushToTr(data) {
        const historyTbody = document.getElementById("historyTbody");

        const title = data.live_stream_title;
        const thumbnail = this.#config.HTTP_BACKEND_URL + "/uploads/videos/thumbnails?file=" + data.video_thumbnail;
        const start = data.start_time;
        const end = data.end_time;
        const duration = end - start;

        const dateStart = new Date(start * 1000);
        const dateEnd = new Date(end * 1000);

        const startDate = dateStart.getDate();
        const startMonth = dateStart.toLocaleString('en-US', { month: 'short' });
        const startYear = dateStart.getFullYear();
        const startHour = dateStart.getHours() < 10 ? `0${dateStart.getHours()}` : `${dateStart.getHours()}`;
        const startMinutes = dateStart.getMinutes() < 10 ? `0${dateStart.getMinutes()}` : `${dateStart.getMinutes()}`;
        const startSeconds = dateStart.getSeconds() < 10 ? `0${dateStart.getSeconds()}` : `${dateStart.getSeconds()}`;

        const endDate = dateEnd.getDate();
        const endMonth = dateEnd.toLocaleString('en-US', { month: 'short' });
        const endYear = dateEnd.getFullYear();
        const endHour =  dateEnd.getHours() < 10 ? `0${dateEnd.getHours()}` : `${dateEnd.getHours()}`;
        const endMinutes = dateEnd.getMinutes() < 10 ? `0${dateEnd.getMinutes()}` : `${dateEnd.getMinutes()}`;
        const endSeconds = dateEnd.getSeconds() < 10 ? `0${dateEnd.getSeconds()}` : `${dateEnd.getSeconds()}`;

        const startFinal = `${startMonth} ${startDate}, ${startYear} ${startHour}:${startMinutes}:${startSeconds}`;
        const endFinal = `${endMonth} ${endDate}, ${endYear} ${endHour}:${endMinutes}:${endSeconds}`;
        const durationFinal = this.#formatTime(duration);

        const tr = `<tr>
                        <td class="align-middle">
                            <div class="d-flex">
                                <div class="me-2 dashoard-stream-video-thumbnail-container">
                                    <img src="${thumbnail}">
                                </div>
                                <div class="d-flex flex-column mt-auto mb-auto">
                                    <span class="small clamp-2">${title}</span>
                                </div>
                            </div>
                        </td>
                        <td class="align-middle">
                            <div>
                                <span class="small">${startFinal}</span>
                            </div>
                        </td>
                        <td class="align-middle">
                            <div>
                                <span class="small">${endFinal}</span>
                            </div>
                        </td>
                        <td class="align-middle">
                            <div>
                                <span class="extra-small">${durationFinal}</span>
                            </div>
                        </td>
                        <td class="align-middle">
                            <div>
                                <a class="text-decoration-none link-text-color red-hover" href="#" onclick="event.preventDefault(); main.view.deleteHistoryModal('${data.id}')"><i class="ti ti-trash"></i></a>
                            </div>
                        </td>
                    </tr>`;
        
        historyTbody.insertAdjacentHTML("beforeend", tr);
    }

    async #historyLooper(data, order) {
        if (order === "desc") {
            for (let i = 0; i < data.length; i++) {
                this.#pushToTr(data[i]);
            }
        } else if (order === "asc") {
            for (let i = data.length - 1; i >= 0; i--) {
                this.#pushToTr(data[i]);
            }
        } else {
            for (let i = 0; i < data.length; i++) {
                this.#pushToTr(data[i]);
            }
        }
    }

    async #getHistory() {
        let res = null;

        this.alertClose();

        try {
            res = await this.#viewModel.getHistory();
        } catch (error) {
            if (error instanceof Unauthorized) {
                const redirecTo = encodeURIComponent("/history");

                window.location.href = "/login?redirect_to=" + redirecTo;
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerHistory");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerHistory");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerHistory");
            } else {
                this.alertDanger("Unknown error.", "alertContainerHistory");
            }

            return null;
        }

        if (res.response === true) {
            this.#historyData = res.histories;
        } else {
            this.alertDanger("Failed to get history data from database.", "alertContainerHistory");

            this.#historyData = null;
        }
    }

    #formatTime(totalSeconds) {
        totalSeconds = Math.floor(totalSeconds); // ensure integer

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');

        // If there are hours, show HH:MM:SS
        if (hours > 0) {
            const hh = String(hours).padStart(2, '0');
            return `${hh}:${mm}:${ss}`;
        }

        // Otherwise show M:SS or MM:SS
        return `${mm}:${ss}`;
    }

    alertDanger(message, alertContainerId) {
        const alert = '<div id="alert" class="alert alert-danger-custom alert-dismissible fade show" role="alert">' +
                            message +
                            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                        '</div>';
        
        document.getElementById(alertContainerId).insertAdjacentHTML("beforeend", alert);
    }

    alertSuccess(message, alertContainerId) {
        const alert = '<div id="alert" class="alert alert-success-custom alert-dismissible fade show" role="alert">' +
                            message +
                            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                        '</div>';
        
        document.getElementById(alertContainerId).insertAdjacentHTML("beforeend", alert);
    }

    alertClose() {
        const alertElement = document.getElementById('alert');

        if (alertElement !== null) {
            const alertInstance = bootstrap.Alert.getOrCreateInstance(alertElement);
            alertInstance.close();
        }
    }
}