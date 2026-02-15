'use strict';

import { IndexViewModel } from "../ViewModel/IndexViewModel.js";
import { User } from "../Utils/User.js";
import { Network } from "../Errors/Network.js";
import { Unauthorized } from "../Errors/Unauthorized.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { Http } from "../Errors/Http.js";
import { BadRequest } from "../Errors/BadRequest.js";
import { Forbidden } from "../Errors/Forbidden.js";
import { Video } from "../Utils/Video.js";

export class IndexView {
    #config = null;
    #viewModel = null;
    #createStreamVideoPlayerWeb = null;
    #createStreamVideoPlayerTablet = null;
    #editStreamVideoPlayerWeb = null;
    #editStreamVideoPlayerTablet = null;
    #createStreamVideoChooserSearchController;
    #deleteStreamId = null;
    #streamSearchController;

    #monitoredLiveStreams = [];
    #offlineLiveStreams = [];
    #allLiveStreamIDs = [];

    #monitorLiveStreamAndUpdateServerTimeIntervalId = null;

    #monitorLiveStreamWSConnection = null;
    #monitorLiveStreamWSShouldReconnect = true;

    #systemMonitorWSConnection = null;
    #systemMonitorWSShouldReconnect = true;

    #serverTime = null;

    constructor(config) {
        this.#config = config;
        this.#viewModel = new IndexViewModel(this.#config);

        this.#checkCredentials();

        this.#setAvatar();

        this.#liveStreamMonitorWSConnect();
        this.#systemMonitorWSConnect();

        this.#loadLiveStreams();

        this.#createStreamHideAndShowStreamKeyListener("web");
        this.#createStreamHideAndShowStreamKeyListener("tablet");

        this.#editStreamHideAndShowStreamKeyListener("web");
        this.#editStreamHideAndShowStreamKeyListener("tablet");

        this.#createStreamVideoChooserDropdownListener("web");
        this.#createStreamVideoChooserDropdownListener("tablet");

        this.#editStreamVideoChooserDropdownListener("web");
        this.#editStreamVideoChooserDropdownListener("tablet");

        this.#createStreamVideoChooserLiveSearchListener("web");
        this.#createStreamVideoChooserLiveSearchListener("tablet");

        this.#editStreamVideoChooserLiveSearchListener("web");
        this.#editStreamVideoChooserLiveSearchListener("tablet");

        this.#streamLiveSearchListener("web");
        this.#streamLiveSearchListener("tablet");

        this.#createStreamModalCloseListener();
        
        this.#editStreamModalCloseListener();

        this.#getServerTime();

        this.monitorLiveStreamAndUpdateServerTime = this.monitorLiveStreamAndUpdateServerTime.bind(this);

        this.#monitorLiveStreamAndUpdateServerTimeInterval();
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
                this.alertDanger("Network error.", "alertContainerDashboard");
            } else if (error instanceof Unauthorized) {
                const redirecTo = encodeURIComponent("/gallery");

                window.location.href = "/login?redirect_to=" + redirecTo;
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else {
                this.alertDanger("Unknown error.", "alertContainerDashboard");
            }

            return null;
        }

        return res.avatar;
    }

    async #getServerTime() {
        let res = null;

        this.alertClose();

        try {
            res = await this.#viewModel.getServerTime();
        } catch (error) {
            if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerDashboard");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else {
                this.alertDanger("Unknown error.", "alertContainerDashboard");
            }

            return;
        }

        this.#serverTime = res.server_time;
    }

    async #systemMonitorWSConnect() {
        this.#systemMonitorWSConnection = this.#viewModel.dashboardMetricsWS();

        this.#systemMonitorWSConnection.onmessage = (event) => {
            const data = JSON.parse(event.data);

            this.#setCpuUsage(data.cpu);
            this.#setMemoryUsage(data.used_memory, data.total_memory);
            this.#internetSpeed(data.download_kbps, data.upload_kbps);
            this.#bandwidthUsage(data.bandwidth);
            this.#diskUsage(data.disk_used, data.disk_available);
        };

        this.#systemMonitorWSConnection.onopen = () => {
            return;
        };

        this.#systemMonitorWSConnection.onerror = (event) => {
            this.showSystemMonitorWebsocketConnectionErrorToast();
            this.#systemMonitorWSClose();
        };

        this.#systemMonitorWSConnection.onclose = (event) => {
            if (!event.wasClean) {
                this.showSystemMonitorWebsocketConnectionClosedToast();
            }

            if (this.#systemMonitorWSShouldReconnect === false) {
                return;
            }

            this.#getServerTime();

            setTimeout(() => this.#systemMonitorWSConnect(), 10000);
        };
    }

    #systemMonitorWSClose() {
        this.#systemMonitorWSShouldReconnect = false;

        this.#systemMonitorWSConnection.close();
    }

    #liveStreamMonitorWSConnect() {
        this.#monitorLiveStreamWSConnection = this.#viewModel.liveStreamMonitorWS();

        this.#monitorLiveStreamWSConnection.onmessage = (event) => {
            this.#monitoredLiveStreams = JSON.parse(event.data);

            this.#setActiveStreams(this.#getActiveLiveStreams());
        };

        this.#monitorLiveStreamWSConnection.onopen = () => {
            this.#liveStreamMonitorWSAuthenticate();
        };

        this.#monitorLiveStreamWSConnection.onerror = (event) => {
            this.showLiveStreamMonitorWebsocketConnectionErrorToast();
            this.#liveStreamMonitorWSClose();
        };

        this.#monitorLiveStreamWSConnection.onclose = (event) => {
            if (!event.wasClean) {
                this.showLiveStreamMonitorWebsocketConnectionClosedToast();
            }

            if (this.#monitorLiveStreamWSShouldReconnect === false) {
                return;
            }

            setTimeout(() => this.#liveStreamMonitorWSConnect(), 10000);
        };
    }

    #liveStreamMonitorWSClose() {
        this.#monitorLiveStreamWSShouldReconnect = false;

        this.#monitorLiveStreamWSConnection.close();
    }

    #liveStreamMonitorWSAuthenticate() {
        const jwt = localStorage.getItem("jwt");
        const authMessage = {
            msg_type: "auth",
            jwt: jwt
        };

        this.#monitorLiveStreamWSConnection.send(JSON.stringify(authMessage));
    }

    showLiveStreamStartedToast() {
        const toastEl = document.getElementById('liveStreamStartedToast');
        const toast = new bootstrap.Toast(toastEl, { autohide: true });
        
        toast.show();
    }

    showLiveStreamScheduledToast() {
        const toastEl = document.getElementById('liveStreamScheduledToast');
        const toast = new bootstrap.Toast(toastEl, { autohide: true });
        
        toast.show();
    }

    showLiveStreamStoppedToast() {
        const toastEl = document.getElementById('liveStreamStoppedToast');
        const toast = new bootstrap.Toast(toastEl, { autohide: true });
        
        toast.show();
    }

    showLiveStreamCancelledToast() {
        const toastEl = document.getElementById('liveStreamCancelledToast');
        const toast = new bootstrap.Toast(toastEl, { autohide: true });
        
        toast.show();
    }

    async startStream(id) {
        let ret = null;

        this.alertClose();

        try {
            ret = await this.#viewModel.startStream(id);
        } catch (error) {
            if (error instanceof Unauthorized) {
                window.href.location = "/login";
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerDashboard");
            } else if (error instanceof BadRequest) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Forbidden) {
                this.alertDanger(error.message + ".", "alertContainerDashboard");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else {
                this.alertDanger("Unknwon error.", "alertContainerDashboard");
            }

            return;
        }

        if (ret.live_stream === id) {
            this.showLiveStreamStartedToast();

            this.#loadLiveStreams();
        } else {
            this.alertDanger("Failed to start live stream.", "alertContainerDashboard");
        }
    }

    async scheduleStream(id) {
        let ret = null;

        this.alertClose();

        try {
            ret = await this.#viewModel.startStream(id);
        } catch (error) {
            if (error instanceof Unauthorized) {
                window.href.location = "/login";
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerDashboard");
            } else if (error instanceof BadRequest) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Forbidden) {
                this.alertDanger(error.message + ".", "alertContainerDashboard");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else {
                this.alertDanger("Unknwon error.", "alertContainerDashboard");
            }

            return;
        }

        if (ret.live_stream === id) {
            this.showLiveStreamScheduledToast();

            this.#loadLiveStreams();
        } else {
            this.alertDanger("Failed to schedule live stream.", "alertContainerDashboard");
        }
    }

    async stopStream(id) {
        let ret = null;

        this.alertClose();

        try {
            ret = await this.#viewModel.stopStream(id);
        } catch (error) {
            if (error instanceof Unauthorized) {
                window.href.location = "/login";
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerDashboard");
            } else if (error instanceof BadRequest) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Forbidden) {
                this.alertDanger(error.message + ".", "alertContainerDashboard");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else {
                this.alertDanger("Unknwon error.", "alertContainerDashboard");
            }

            return;
        }

        if (ret.stoped_live_stream_id === id) {
            this.showLiveStreamStoppedToast();
        } else {
            this.alertDanger("Failed to stop live stream.", "alertContainerDashboard");
        }
    }

    async cancelStream(id) {
        let ret = null;

        this.alertClose();

        try {
            ret = await this.#viewModel.cancelStream(id);
        } catch (error) {
            if (error instanceof Unauthorized) {
                window.href.location = "/login";
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerDashboard");
            } else if (error instanceof BadRequest) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Forbidden) {
                this.alertDanger(error.message + ".", "alertContainerDashboard");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else {
                this.alertDanger("Unknwon error.", "alertContainerDashboard");
            }

            return;
        }

        if (ret.cancelled_live_stream_id === id) {
            this.showLiveStreamCancelledToast();
        } else {
            this.alertDanger("Failed to cancel live stream.", "alertContainerDashboard");
        }
    }

    monitorLiveStreamAndUpdateServerTimeClearInterval() {
        clearInterval(this.#monitorLiveStreamAndUpdateServerTimeIntervalId);
    }

    #monitorLiveStreamAndUpdateServerTimeInterval() {
        this.#monitorLiveStreamAndUpdateServerTimeIntervalId = setInterval(this.monitorLiveStreamAndUpdateServerTime, 1000);
    }

    monitorLiveStreamAndUpdateServerTime() {
        const dashboardServerTimeWeb = document.getElementById("serverTimeDashboardWeb");
        const dashboardServerTimeTablet = document.getElementById("serverTimeDashboardTablet");
        const createStreamServerTimeWeb = document.getElementById("serverTimeCreateStreamWeb");
        const createStreamServerTimeTablet = document.getElementById("serverTimeCreateStreamTablet");
        const editStreamServerTimeWeb = document.getElementById("serverTimeEditStreamWeb");
        const editStreamServerTimeTablet = document.getElementById("serverTimeEditStreamTablet");

        const date = new Date(this.#serverTime * 1000);
        const hours = date.getHours() < 10 ? `0${date.getHours()}` : `${date.getHours()}`;
        const minutes = date.getMinutes() < 10 ? `0${date.getMinutes()}` : `${date.getMinutes()}`;
        const seconds = date.getSeconds() < 10 ? `0${date.getSeconds()}` : `${date.getSeconds()}`;
        const serverTime = `Server time : ${date.toLocaleString('en-US', { month: 'short' })} ${date.getDate()} ${date.getFullYear()} ${hours}:${minutes}:${seconds}`;

        dashboardServerTimeWeb.textContent = serverTime;
        dashboardServerTimeTablet.textContent = serverTime;
        createStreamServerTimeWeb.textContent = serverTime;
        createStreamServerTimeTablet.textContent = serverTime;
        editStreamServerTimeWeb.textContent = serverTime;
        editStreamServerTimeTablet.textContent = serverTime;

        this.#serverTime = this.#serverTime + 1;

        for(let i = 0; i < this.#allLiveStreamIDs.length; i++) {
            const id = this.#allLiveStreamIDs[i];
            const status = this.#getLiveStreamStatusById(id);
            
            const scheduleContainerWeb = document.getElementById("liveStreamScheduleContainerWeb-" + id);
            const statusContainerWeb = document.getElementById("liveStreamStatusContainerWeb-" + id);
            const actionButtonContainerWeb = document.getElementById("liveStreamActionButtonContainerWeb-" + id);

            const calendarContainerTablet = document.getElementById("liveStreamCalendarContainerTablet-" + id);
            const statusContainerTablet = document.getElementById("liveStreamStatusTablet-" + id);
            const actionButtonContainerTablet = document.getElementById("liveStreamActionButtonContainerTablet-" + id);

            scheduleContainerWeb.replaceChildren();
            statusContainerWeb.replaceChildren();
            actionButtonContainerWeb.replaceChildren();

            calendarContainerTablet.replaceChildren();
            statusContainerTablet.replaceChildren();
            actionButtonContainerTablet.replaceChildren();

            let scheduleContentWeb = null;
            let statusContentWeb = null;
            let actionButtonContentWeb = null;

            let calendarContentTablet = null;
            let statusContentTablet = null;
            let actionButtonContentTablet = null;

            switch(status) {
                case "offline" : {
                    // Web
                    scheduleContentWeb = `<span class="extra-small">--</span>`;
                    statusContentWeb = `<i class="ti ti-circle-dot me-1"></i>
                                        <span class="extra-small">Offline</span>`;
                    actionButtonContentWeb = `<button type="button" class="btn btn-sm btn-primary-custom me-2" onclick="main.view.startStream(${id});">Start</button>`;

                    // Tablet
                    calendarContentTablet = `<i class="ti ti-calendar"></i>
                                                <span>--</span>`;
                    statusContentTablet = `<i class="ti ti-circle-dot mt-auto mb-auto"></i>
                                            <span class="video-card-status-badge">Offline</span>`;
                    actionButtonContentTablet = `<button class="btn btn-primary-custom btn-sm px-3" onclick="main.view.startStream(${id});">
                                                    Start
                                                </button>`;

                    break;
                }
                case "scheduled" : {
                    const schedule = this.#getLiveStreamScheduleById(id);

                    // Web
                    statusContentWeb = `<i class="ti ti-calendar-event me-1"></i>
                                        <span class="extra-small">Scheduled</span>`;
                    actionButtonContentWeb = `<button type="button" class="btn btn-sm btn-warning me-2" onclick="main.view.cancelStream(${id});">Cancel</button>`;

                    // Tablet
                    statusContentTablet = `<i class="ti ti-circle-dot mt-auto mb-auto"></i>
                                            <span class="video-card-status-badge">Scheduled</span>`;
                    actionButtonContentTablet = `<button class="btn btn-warning btn-sm px-3" onclick="main.view.cancelStream(${id});">
                                                    Cancel
                                                </button>`;
                    
                    if (schedule !== null) {
                        if (schedule.scheduleStart != null && schedule.scheduleEnd != null) {
                            const dateScheduleStart = new Date(schedule.scheduleStart * 1000);
                            const scheduleStartHours = dateScheduleStart.getHours() < 10 ? `0${dateScheduleStart.getHours()}` : `${dateScheduleStart.getHours()}`;
                            const scheduleStartMinutes = dateScheduleStart.getMinutes() < 10 ? `0${dateScheduleStart.getMinutes()}` : `${dateScheduleStart.getMinutes()}`;
                            const scheduleStartDateAndTime = `Start: ${dateScheduleStart.toLocaleString('en-US', { month: 'short' })} ${dateScheduleStart.getDate()}, ${dateScheduleStart.getFullYear()} ${scheduleStartHours}:${scheduleStartMinutes}`;

                            const dateScheduleEnd = new Date(schedule.scheduleEnd * 1000);
                            const scheduleEndHours = dateScheduleEnd.getHours() < 10 ? `0${dateScheduleEnd.getHours()}` : `${dateScheduleEnd.getHours()}`;
                            const scheduleEndMinutes = dateScheduleEnd.getMinutes() < 10 ? `0${dateScheduleEnd.getMinutes()}` : `${dateScheduleEnd.getMinutes()}`;
                            const scheduleEndDateAndTime = `End: ${dateScheduleEnd.toLocaleString('en-US', { month: 'short' })} ${dateScheduleEnd.getDate()}, ${dateScheduleEnd.getFullYear()} ${scheduleEndHours}:${scheduleEndMinutes}`;

                            // Web
                            scheduleContentWeb = `<span class="extra-small">${scheduleStartDateAndTime}</span>
                                                    <span class="extra-small">${scheduleEndDateAndTime}</span>`
                            
                            // Tablet
                            calendarContentTablet = `<div class="meta small mt-2">
                                                            <i class="ti ti-calendar-event"></i>
                                                            <span class="fw-bold">${scheduleStartDateAndTime}</span>
                                                        </div>
                                                        <div class="meta small">
                                                            <i class="ti ti-calendar-check"></i>
                                                            <span class="fw-bold">${scheduleEndDateAndTime}</span>
                                                        </div>`;
                        } else if (schedule.scheduleStart != null) {
                            const dateScheduleStart = new Date(schedule.scheduleStart * 1000);
                            const scheduleStartHours = dateScheduleStart.getHours() < 10 ? `0${dateScheduleStart.getHours()}` : `${dateScheduleStart.getHours()}`;
                            const scheduleStartMinutes = dateScheduleStart.getMinutes() < 10 ? `0${dateScheduleStart.getMinutes()}` : `${dateScheduleStart.getMinutes()}`;
                            const scheduleStartDateAndTime = `Start: ${dateScheduleStart.toLocaleString('en-US', { month: 'short' })} ${dateScheduleStart.getDate()}, ${dateScheduleStart.getFullYear()} ${scheduleStartHours}:${scheduleStartMinutes}`;

                            // Web
                            scheduleContentWeb = `<span class="extra-small">${scheduleStartDateAndTime}</span>`;

                            // Tablet
                            calendarContentTablet = `<div class="meta small mt-2">
                                                            <i class="ti ti-calendar-event"></i>
                                                            <span class="fw-bold">${scheduleStartDateAndTime}</span>
                                                        </div>`;
                        } else if (schedule.scheduleEnd != null) {
                            const dateScheduleEnd = new Date(schedule.scheduleEnd * 1000);
                            const scheduleEndHours = dateScheduleEnd.getHours() < 10 ? `0${dateScheduleEnd.getHours()}` : `${dateScheduleEnd.getHours()}`;
                            const scheduleEndMinutes = dateScheduleEnd.getMinutes() < 10 ? `0${dateScheduleEnd.getMinutes()}` : `${dateScheduleEnd.getMinutes()}`;
                            const scheduleEndDateAndTime = `End: ${dateScheduleEnd.toLocaleString('en-US', { month: 'short' })} ${dateScheduleEnd.getDate()}, ${dateScheduleEnd.getFullYear()} ${scheduleEndHours}:${scheduleEndMinutes}`;

                            // Web
                            scheduleContentWeb = `<span class="extra-small">${scheduleEndDateAndTime}</span>`;

                            // Tablet
                            calendarContentTablet = `<div class="meta small">
                                                            <i class="ti ti-calendar-check"></i>
                                                            <span class="fw-bold">${scheduleEndDateAndTime}</span>
                                                        </div>`;
                        } else {
                            // Web
                            scheduleContentWeb = `<span class="extra-small">--</span>`;

                            // Tablet
                            calendarContentTablet = `<div class="meta small">
                                                            <i class="ti ti-calendar-check"></i>
                                                            <span class="fw-bold">--</span>
                                                        </div>`;
                        }

                        break;
                    }
                }
                case "live" : {
                    const schedule = this.#getLiveStreamScheduleById(id);
                    const now = Math.floor(Date.now() / 1000)
                    const startedAt = this.#getLiveStreamStartById(id);
                    const liveTime = this.#formatTime(now - startedAt);

                    // Web
                    statusContentWeb = `<i class="ti ti-circle-dot me-1"></i>
                                        <span class="extra-small">Live • ${liveTime}</span>`;
                    actionButtonContentWeb = `<button type="button" class="btn btn-sm btn-danger-custom me-2" onclick="main.view.stopStream(${id});">Stop</button>`;

                    // Tablet
                    statusContentTablet = `<i class="ti ti-circle-dot mt-auto mb-auto"></i>
                                            <span class="video-card-status-badge">Live • ${liveTime}</span>`;
                    actionButtonContentTablet = `<button class="btn btn-danger-custom btn-sm px-3" onclick="main.view.stopStream(${id});">
                                                    Stop
                                                </button>`;
                    
                    if (schedule !== null) {
                        if (schedule.scheduleStart != null && schedule.scheduleEnd != null) {
                            const dateScheduleStart = new Date(schedule.scheduleStart * 1000);
                            const scheduleStartHours = dateScheduleStart.getHours() < 10 ? `0${dateScheduleStart.getHours()}` : `${dateScheduleStart.getHours()}`;
                            const scheduleStartMinutes = dateScheduleStart.getMinutes() < 10 ? `0${dateScheduleStart.getMinutes()}` : `${dateScheduleStart.getMinutes()}`;
                            const scheduleStartDateAndTime = `Start: ${dateScheduleStart.toLocaleString('en-US', { month: 'short' })} ${dateScheduleStart.getDate()}, ${dateScheduleStart.getFullYear()} ${scheduleStartHours}:${scheduleStartMinutes}`;

                            const dateScheduleEnd = new Date(schedule.scheduleEnd * 1000);
                            const scheduleEndHours = dateScheduleEnd.getHours() < 10 ? `0${dateScheduleEnd.getHours()}` : `${dateScheduleEnd.getHours()}`;
                            const scheduleEndMinutes = dateScheduleEnd.getMinutes() < 10 ? `0${dateScheduleEnd.getMinutes()}` : `${dateScheduleEnd.getMinutes()}`;
                            const scheduleEndDateAndTime = `End: ${dateScheduleEnd.toLocaleString('en-US', { month: 'short' })} ${dateScheduleEnd.getDate()}, ${dateScheduleEnd.getFullYear()} ${scheduleEndHours}:${scheduleEndMinutes}`;

                            // Web
                            scheduleContentWeb = `<span class="extra-small">${scheduleStartDateAndTime}</span>
                                                    <span class="extra-small">${scheduleEndDateAndTime}</span>`;

                            // Tablet
                            calendarContentTablet = `<div class="meta small mt-2">
                                                            <i class="ti ti-calendar-event"></i>
                                                            <span class="fw-bold">${scheduleStartDateAndTime}</span>
                                                        </div>
                                                        <div class="meta small">
                                                            <i class="ti ti-calendar-check"></i>
                                                            <span class="fw-bold">${scheduleEndDateAndTime}</span>
                                                        </div>`;
                        } else if (schedule.scheduleStart != null) {
                            const dateScheduleStart = new Date(schedule.scheduleStart * 1000);
                            const scheduleStartHours = dateScheduleStart.getHours() < 10 ? `0${dateScheduleStart.getHours()}` : `${dateScheduleStart.getHours()}`;
                            const scheduleStartMinutes = dateScheduleStart.getMinutes() < 10 ? `0${dateScheduleStart.getMinutes()}` : `${dateScheduleStart.getMinutes()}`;
                            const scheduleStartDateAndTime = `Start: ${dateScheduleStart.toLocaleString('en-US', { month: 'short' })} ${dateScheduleStart.getDate()}, ${dateScheduleStart.getFullYear()} ${scheduleStartHours}:${scheduleStartMinutes}`;

                            // Web
                            scheduleContentWeb = `<span class="extra-small">${scheduleStartDateAndTime}</span>`;

                            // Tablet
                            calendarContentTablet = `<div class="meta small mt-2">
                                                            <i class="ti ti-calendar-event"></i>
                                                            <span class="fw-bold">${scheduleStartDateAndTime}</span>
                                                        </div>`;
                        } else if (schedule.scheduleEnd != null) {
                            const dateScheduleEnd = new Date(schedule.scheduleEnd * 1000);
                            const scheduleEndHours = dateScheduleEnd.getHours() < 10 ? `0${dateScheduleEnd.getHours()}` : `${dateScheduleEnd.getHours()}`;
                            const scheduleEndMinutes = dateScheduleEnd.getMinutes() < 10 ? `0${dateScheduleEnd.getMinutes()}` : `${dateScheduleEnd.getMinutes()}`;
                            const scheduleEndDateAndTime = `End: ${dateScheduleEnd.toLocaleString('en-US', { month: 'short' })} ${dateScheduleEnd.getDate()}, ${dateScheduleEnd.getFullYear()} ${scheduleEndHours}:${scheduleEndMinutes}`;

                            // Web
                            scheduleContentWeb = `<span class="extra-small">${scheduleEndDateAndTime}</span>`;

                            // Tablet
                            calendarContentTablet = `<div class="meta small">
                                                            <i class="ti ti-calendar-check"></i>
                                                            <span class="fw-bold">${scheduleEndDateAndTime}</span>
                                                        </div>`;
                        } else {
                            // Web
                            scheduleContentWeb = `<span class="extra-small">--</span>`;

                            // Tablet
                            calendarContentTablet = `<div class="meta small">
                                                            <i class="ti ti-calendar-check"></i>
                                                            <span class="fw-bold">--</span>
                                                        </div>`;
                        }

                        break;
                    }
                }
                case "starting": {
                    // Web
                    statusContentWeb = `<i class="ti ti-circle-dot me-1"></i>
                                        <span class="extra-small">Starting...</span>`;
                    actionButtonContentWeb = `<button type="button" class="btn btn-sm btn-primary-custom me-2" onclick="return;">
                                                <div class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true">
                                                    <span class="sr-only"></span>
                                                </div>
                                                </button>`;

                    // Tablet
                    statusContentTablet = `<i class="ti ti-circle-dot mt-auto mb-auto"></i>
                                            <span class="video-card-status-badge">Starting...</span>`;
                    actionButtonContentTablet = `<button class="btn btn-primary-custom btn-sm px-3" onclick="main.view.stopStream(${id});">
                                                    <div class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true">
                                                        <span class="sr-only"></span>
                                                    </div>
                                                </button>`;
                    
                    // Web
                    scheduleContentWeb = `<span class="extra-small">--</span>`;

                    // Tablet
                    calendarContentTablet = `<div class="meta small">
                                                    <i class="ti ti-calendar-check"></i>
                                                    <span class="fw-bold">--</span>
                                                </div>`;
                }
            }

            scheduleContainerWeb.insertAdjacentHTML("beforeend", scheduleContentWeb);
            statusContainerWeb.insertAdjacentHTML("beforeend", statusContentWeb);
            actionButtonContainerWeb.insertAdjacentHTML("beforeend", actionButtonContentWeb);

            calendarContainerTablet.insertAdjacentHTML("beforeend", calendarContentTablet);
            statusContainerTablet.insertAdjacentHTML("beforeend", statusContentTablet);
            actionButtonContainerTablet.insertAdjacentHTML("beforeend", actionButtonContentTablet);
        }
    }

    #getActiveLiveStreams() {
        let active = 0;

        for (let i = 0; i < this.#monitoredLiveStreams.length; i++) {
            if (this.#monitoredLiveStreams[i].status === "live") {
                active++;
            }
        }

        return active;
    }

    #getLiveStreamStartById(id) {
        for(let i = 0; i < this.#monitoredLiveStreams.length; i++) {
            if (this.#monitoredLiveStreams[i].id === id) {
                return this.#monitoredLiveStreams[i].started_at;
            }
        }
    }

    #getLiveStreamScheduleById(id) {
        for(let i = 0; i < this.#monitoredLiveStreams.length; i++) {
            if (this.#monitoredLiveStreams[i].id === id) {
                return {
                    scheduleStart: this.#monitoredLiveStreams[i].schedule_start,
                    scheduleEnd: this.#monitoredLiveStreams[i].schedule_end
                }
            }
        }

        return null;
    }

    #getLiveStreamStatusById(id) {
        for(let i = 0; i < this.#monitoredLiveStreams.length; i++) {
            if (this.#monitoredLiveStreams[i].id == id) {
                return this.#monitoredLiveStreams[i].status;
            }
        }

        return "offline";
    }

    #streamLiveSearchDebounce(fn, delay = 500) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    async #streamLiveSearchListener(mode) {
        const input = mode === "web" ? document.getElementById("searchStreamWeb") : document.getElementById("searchStreamTablet");
        const liveStreamContentContainerWeb = document.getElementById("liveStreamsContentWeb");
        const liveStreamContentContainerTablet = document.getElementById("liveStreamsContentTablet");
        const search = this.#streamLiveSearchDebounce(async (keyword) => {
            let data = null;

            if (this.#streamSearchController) {
                this.#streamSearchController.abort();
            }

            this.#streamSearchController = new AbortController();

            if (!keyword.trim()) {
                this.#allLiveStreamIDs = [];
                this.#loadLiveStreams();

                return;
            }

            data = await this.#searchStream(this.#streamSearchController.signal, keyword);
            this.#allLiveStreamIDs = [];

            if (mode === "web") {
                liveStreamContentContainerWeb.replaceChildren();
                this.#liveStreamLooperWeb(data);
            } else {
                liveStreamContentContainerTablet.replaceChildren();
                this.#liveStreamLooperTablet(data);
            }
        })

        input.addEventListener('input', (e) => {
            search(e.target.value);
        });
    }

    async #searchStream(controllerSignal, keyword) {
        let res = null;

        this.alertClose();
        
        try {
            res = await this.#viewModel.searchStream(controllerSignal, keyword);
        } catch (error) {
            if (error instanceof BadRequest) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerDashboard");
            } else if (error instanceof Unauthorized) {
                window.location.href = "/login";
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else {
                this.alertDanger("Unknown error.", "alertContainerDashboard");
            }

            return null;
        }

        if (res.response === true) {
            return res.live_streams;
        } else {
            this.alertDanger("Failed to search live stream data.", "alertContainerDashboard");

            return null;
        }
    }

    async deleteStream() {
        let res = null;

        if (this.#deleteStreamId === null) {
            return;
        }

        this.alertClose();

        try {
            res = await this.#viewModel.deleteStream(this.#deleteStreamId);
        } catch (error) {
            if (error instanceof Unauthorized) {
                window.location.href = "/login";
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerDeleteStream");
            } else if (error instanceof Forbidden) {
                this.alertDanger(error.message + ".", "alertContainerDeleteStream");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDeleteStream");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDeleteStream");
            } else {
                this.alertDanger("Unknown error.", "alertContainerDeleteStream");
            }

            return;
        }

        const modalEl = document.getElementById('deleteStreamModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

        if (res.delete === true) {
            this.#loadLiveStreams();
            this.alertSuccess("Successfully delete live stream.", "alertContainerDashboard");
        } else {
            this.alertSuccess("Failed to delete live stream.", "alertContainerDashboard");
        }

        modal.hide();
    }

    deleteStreamModal(id) {
        this.#deleteStreamId = id;

        const modalEl = document.getElementById('deleteStreamModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        const liveStreamStautus = this.#getLiveStreamStatusById(id);

        modal.show();

        if (liveStreamStautus === "scheduled" || liveStreamStautus === "starting" || liveStreamStautus === "live") {
            const deleteButton = document.getElementById("deleteStreamButton");

            deleteButton.disabled = true;
            this.alertDanger("Live stream is " + liveStreamStautus + ". Please stop or cancel it before deletion.", "alertContainerDeleteStream");
        }
    }

    async #checkCredentials() {
        let cred = null;

        try {
            cred = await User.checkCredentials();
        } catch (error) {
            if (error instanceof Network) {
                this.showCheckCredentialsNetworkErrorToast();
            } else {
                this.showCheckCredentialsNetworkErrorToast();
            }
        }

        if (cred !== null && cred === false) {
            window.location.href = "/login";
        } else {
            document.getElementById('body').style.display = 'block';
        }
    }

    async #editStreamPost(data) {
        let res = null;

        this.alertClose();

        try {
            res = await this.#viewModel.editStreamPost(data);
        } catch (error) {
            if (error instanceof Unauthorized) {
                window.location.href = "/login";
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerEditStreamModal");
            } else if (error instanceof Forbidden) {
                this.alertDanger(error.response.error + ".", "alertContainerEditStreamModal");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerEditStreamModal");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerEditStreamModal");
            } else if (error instanceof BadRequest) {
                this.alertDanger(error.response.error + ".", "alertContainerEditStreamModal");
            } else {
                this.alertDanger("Unknown error.", "alertContainerEditStreamModal");
            }

            return;
        }

        const modalEl = document.getElementById('editStreamModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

        if (res.update === true) {
            this.#loadLiveStreams();
            this.alertSuccess("Successfully update live stream data.", "alertContainerDashboard");
            
            modal.hide();
        } else {
            this.alertSuccess("Failed to update live stream data.", "alertContainerDashboard");

            modal.hide();
        }
    }

    #editStreamCollectData(mode) {
        const streamId = mode === "web" ? document.getElementById("editStreamStreamIdWeb") : document.getElementById("editStreamStreamIdTablet");
        const video = mode === "web" ? document.getElementById("editStreamVideoChooserDropdownButtonWeb") : document.getElementById("editStreamVideoChooserDropdownButtonTablet");
        const streamTitle = mode === "web" ? document.getElementById("editStreamStreamTitleWeb") : document.getElementById("editStreamStreamTitleTablet");
        const rtmpUrl = mode === "web" ? document.getElementById("editStreamRtmpUrlWeb") : document.getElementById("editStreamRtmpUrlTablet");
        const streamKey = mode === "web" ? document.getElementById("editStreamStreamKeyWeb") : document.getElementById("editStreamStreamKeyTablet");
        const loopVideoIn = mode === "web" ? document.getElementById("editStreamLoopVideoInWeb") : document.getElementById("editStreamLoopVideoInTablet");
        const schedulStart = mode === "web" ? document.getElementById("editStreamStartTimeWeb") : document.getElementById("editStreamStartTimeTablet");
        const scheduleEnd = mode === "web" ? document.getElementById("editStreamEndTimeWeb") : document.getElementById("editStreamEndTimeTablet");

        let start = null;
        let end = null;

        if (schedulStart.value !== '') {
            start = this.#datetimeLocalToUnix(schedulStart.value);
        }

        if (scheduleEnd.value !== '') {
            end = this.#datetimeLocalToUnix(scheduleEnd.value);
        }

        const data = {
            id: parseInt(streamId.value),
            title: streamTitle.value,
            video: parseInt(video.value),
            rtmp_url: rtmpUrl.value,
            stream_key: streamKey.value,
            stream_loop: parseInt(loopVideoIn.value),
            schedule_start: start,
            schedule_end: end
        };

        return data;
    }

    #editStreamValidation(mode) {
        let ret = true;
        const video = mode === "web" ? document.getElementById("editStreamVideoChooserDropdownButtonWeb") : document.getElementById("editStreamVideoChooserDropdownButtonTablet");
        const streamTitle = mode === "web" ? document.getElementById("editStreamStreamTitleWeb") : document.getElementById("editStreamStreamTitleTablet");
        const rtmpUrl = mode === "web" ? document.getElementById("editStreamRtmpUrlWeb") : document.getElementById("editStreamRtmpUrlTablet");
        const streamKey = mode === "web" ? document.getElementById("editStreamStreamKeyWeb") : document.getElementById("editStreamStreamKeyTablet");
        const loopVideoIn = mode === "web" ? document.getElementById("editStreamLoopVideoInWeb") : document.getElementById("editStreamLoopVideoInTablet");
        const streamStartTime = mode === "web" ? document.getElementById("editStreamStartTimeWeb") : document.getElementById("editStreamStartTimeTablet");
        const streamEndTime = mode === "web" ? document.getElementById("editStreamEndTimeWeb") : document.getElementById("editStreamEndTimeTablet");

        const rtmpUrlError = mode === "web" ? document.getElementById("editStreamRtmpUrlWebError") : document.getElementById("editStreamRtmpUrlTabletError");
        const streamKeyError = mode === "web" ? document.getElementById("editStreamStreamKeyWebError") : document.getElementById("editStreamStreamKeyTabletError");
        const loopVideoInError = mode === "web" ? document.getElementById("editStreamLoopVideoInWebError") : document.getElementById("editStreamLoopVideoInTabletError");
        const streamStartTimeError = mode === "web" ? document.getElementById("editStreamStartTimeWebError") : document.getElementById("editStreamStartTimeTabletError");
        const streamEndTimeError = mode === "web" ? document.getElementById("editStreamEndTimeWebError") : document.getElementById("editStreamEndTimeTabletError");

        video.classList.remove("is-invalid");
        streamTitle.classList.remove("is-invalid");
        rtmpUrl.classList.remove("is-invalid");
        streamKey.classList.remove("is-invalid");
        loopVideoIn.classList.remove("is-invalid");
        streamStartTime.classList.remove("is-invalid");
        streamEndTime.classList.remove("is-invalid");

        rtmpUrlError.classList.remove("d-block");
        streamKeyError.classList.remove("d-block");
        loopVideoInError.classList.remove("d-block");
        streamStartTime.classList.remove("is-invalid");
        streamEndTime.classList.remove("is-invalid");

        if (video.value === "" || video.value === null || video.value === undefined) {
            video.classList.add("is-invalid");

            ret = false;
        }

        if (streamTitle.value === "") {
            streamTitle.classList.add("is-invalid");

            ret = false;
        }

        if (rtmpUrl.value === "") {
            rtmpUrl.classList.add("is-invalid");
            rtmpUrlError.classList.add("d-block");

            ret = false;
        }

        if (streamKey.value === "") {
            streamKey.classList.add("is-invalid");
            streamKeyError.classList.add("d-block");

            ret = false;
        }

        if (loopVideoIn.value === "") {
            loopVideoIn.classList.add("is-invalid");
            loopVideoInError.classList.add("d-block");

            ret = false;
        }

        if (streamStartTime.value !== "") {
            const now = parseInt(new Date() / 1000);
            const startTimeUnixTimestamp = parseInt(new Date(streamStartTime.value) / 1000);

            if (startTimeUnixTimestamp < now) {
                streamStartTime.classList.add("is-invalid");
                streamStartTimeError.textContent = "Start time can't be past time. It must be future.";

                ret = false;
            }
        }

        if (streamEndTime.value !== "") {
            const now = parseInt(new Date() / 1000);
            const endTimeUnixTimestamp = parseInt(new Date(streamEndTime.value) / 1000);
            let startTimeUnixTimestamp = null;

            if (streamStartTime.value !== "") {
                startTimeUnixTimestamp = parseInt(new Date(streamStartTime.value) / 1000);
            }

            if (startTimeUnixTimestamp !== null) {
                if (endTimeUnixTimestamp < startTimeUnixTimestamp) {
                    streamEndTime.classList.add("is-invalid");
                    streamEndTimeError.textContent = "End time must be greater than start time.";

                    ret = false;
                }
            } else if (endTimeUnixTimestamp < now) {
                streamEndTime.classList.add("is-invalid");
                streamEndTimeError.textContent = "End time can't be past time. It must be future.";

                ret = false
            }
        }

        return ret;
    }

    async editStreamSubmit(mode) {
        const valid = this.#editStreamValidation(mode);

        if (valid) {
            const data = this.#editStreamCollectData(mode);

            await this.#editStreamPost(data);

            if (data.schedule_start !== null) {
                this.scheduleStream(data.id);
            }
        }
    }

    #editStreamModalCloseListener() {
        const modalEl = document.getElementById('editStreamModal');
        
        modalEl.addEventListener('hidden.bs.modal', () => {
            if (this.#editStreamVideoPlayerWeb) {
                this.#editStreamVideoPlayerWeb.pause();
                this.#editStreamVideoPlayerWeb.currentTime(0);
            }

            if (this.#editStreamVideoPlayerTablet) {
                this.#editStreamVideoPlayerTablet.pause();
                this.#editStreamVideoPlayerTablet.currentTime(0);
            }
        });
    }

    #unixTimestampToDateTimeLocal(timestamp) {
        const date = new Date(timestamp * 1000);

        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');

        const hh = String(date.getHours()).padStart(2, '0');
        const mi = String(date.getMinutes()).padStart(2, '0');

        return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    }

    #setEditStreamDataWeb(data) {
        const status = this.#getLiveStreamStatusById(data.live_stream.id);

        const streamId = document.getElementById("editStreamStreamIdWeb");
        const videoChooser = document.getElementById("editStreamVideoChooserDropdownButtonWeb");
        const title = document.getElementById("editStreamStreamTitleWeb");
        const streamKey = document.getElementById("editStreamStreamKeyWeb");
        const rtmpUrl = document.getElementById("editStreamRtmpUrlWeb");
        const loop = document.getElementById("editStreamLoopVideoInWeb");
        const startTime = document.getElementById("editStreamStartTimeWeb");
        const endTime = document.getElementById("editStreamEndTimeWeb");
        const videoPreview = document.getElementById("editStreamVideoPreviewWeb");
        const videoUrl = this.#config.HTTP_BACKEND_URL + "/uploads/videos?file=" + data.live_stream.video.file;
        const videoMime = Video.guessVideoMimeType(videoUrl);
        const videoPlayer = `<video
                                id="editStreamVideoPlayerWeb"
                                class="video-js vjs-default-skin vjs-fluid create-stream-video-player"
                                controls
                                preload="auto"
                                data-setup="{}"
                            >
                                <p class="vjs-no-js">
                                To view this video please enable JavaScript, and consider upgrading to a
                                web browser that
                                <a href="https://videojs.com/html5-video-support/" target="_blank"
                                    >supports HTML5 video</a
                                >
                                </p>
                            </video>`;
        const submitButton = document.getElementById("editStreamSubmitButtonWeb");

        streamId.value = data.live_stream.id;
        videoChooser.textContent = data.live_stream.video.title;
        videoChooser.value = data.live_stream.video.id;
        title.value = data.live_stream.title;
        streamKey.value = data.live_stream.stream_key;
        rtmpUrl.value = data.live_stream.rtmp_url;
        loop.value = parseInt(data.live_stream.stream_loop);

        if (data.live_stream.schedule_start !== null) {
            startTime.value = this.#unixTimestampToDateTimeLocal(data.live_stream.schedule_start);
        } else {
            startTime.value = "";
        }

        if (data.live_stream.schedule_end !== null) {
            endTime.value = this.#unixTimestampToDateTimeLocal(data.live_stream.schedule_end);
        } else {
            endTime.value = "";
        }

        if (this.#editStreamVideoPlayerWeb === null) {
            videoPreview.replaceChildren();
            videoPreview.insertAdjacentHTML("beforeend", videoPlayer);

            this.#editStreamVideoPlayerWeb = videojs("editStreamVideoPlayerWeb");
        }

        this.#editStreamVideoPlayerWeb.src({
            src: videoUrl,
            type: videoMime
        });

        if (status === "live" || status === "scheduled") {
            streamId.disabled = true;
            videoChooser.disabled = true;
            title.disabled = true;
            streamKey.disabled = true;
            rtmpUrl.disabled = true;
            loop.disabled = true;
            startTime.disabled = true;
            endTime.disabled = true;
            submitButton.disabled = true;

            if (status === "scheduled") {
                this.alertDanger("This live stream is currently " + status + ", you can't edit this live stream until you cancel the schedule.", "alertContainerEditStreamModal");
            } else {
                this.alertDanger("This live stream is currently " + status + ", you can't edit this live stream until you stop it.", "alertContainerEditStreamModal");
            }
        } else {
            streamId.disabled = false;
            videoChooser.disabled = false;
            title.disabled = false;
            streamKey.disabled = false;
            rtmpUrl.disabled = false;
            loop.disabled = false;
            startTime.disabled = false;
            endTime.disabled = false;
            submitButton.disabled = false;

            document.querySelectorAll('.alert').forEach(alert => alert.remove());
        }
    }

    #setEditStreamDataTablet(data) {
        const status = this.#getLiveStreamStatusById(data.live_stream.id);
        
        const streamId = document.getElementById("editStreamStreamIdTablet");
        const videoChooser = document.getElementById("editStreamVideoChooserDropdownButtonTablet");
        const title = document.getElementById("editStreamStreamTitleTablet");
        const streamKey = document.getElementById("editStreamStreamKeyTablet");
        const rtmpUrl = document.getElementById("editStreamRtmpUrlTablet");
        const loop = document.getElementById("editStreamLoopVideoInTablet");
        const startTime = document.getElementById("editStreamStartTimeTablet");
        const endTime = document.getElementById("editStreamEndTimeTablet");
        const videoPreview = document.getElementById("editStreamVideoPreviewTablet");
        const videoUrl = this.#config.HTTP_BACKEND_URL + "/uploads/videos?file=" + data.live_stream.video.file;
        const videoMime = Video.guessVideoMimeType(videoUrl);
        const videoPlayer = `<video
                                id="editStreamVideoPlayerTablet"
                                class="video-js vjs-default-skin vjs-fluid create-stream-video-player"
                                controls
                                preload="auto"
                                data-setup="{}"
                            >
                                <p class="vjs-no-js">
                                To view this video please enable JavaScript, and consider upgrading to a
                                web browser that
                                <a href="https://videojs.com/html5-video-support/" target="_blank"
                                    >supports HTML5 video</a
                                >
                                </p>
                            </video>`;
        const submitButton = document.getElementById("editStreamSubmitButtonWeb");

        streamId.value = data.live_stream.id;
        videoChooser.textContent = data.live_stream.video.title;
        videoChooser.value = data.live_stream.video.id;
        title.value = data.live_stream.title;
        streamKey.value = data.live_stream.stream_key;
        rtmpUrl.value = data.live_stream.rtmp_url;
        loop.value = parseInt(data.live_stream.stream_loop);

        if (data.live_stream.schedule_start !== null) {
            startTime.value = this.#unixTimestampToDateTimeLocal(data.live_stream.schedule_start);
        } else {
            startTime.value = "";
        }

        if (data.live_stream.schedule_end !== null) {
            endTime.value = this.#unixTimestampToDateTimeLocal(data.live_stream.schedule_end);
        } else {
            endTime.value = "";
        }

        if (this.#editStreamVideoPlayerTablet === null) {
            videoPreview.replaceChildren();
            videoPreview.insertAdjacentHTML("beforeend", videoPlayer);

            this.#editStreamVideoPlayerTablet = videojs("editStreamVideoPlayerTablet");
        }

        this.#editStreamVideoPlayerTablet.src({
            src: videoUrl,
            type: videoMime
        });

        if (status === "live" || status === "scheduled") {
            streamId.disabled = true;
            videoChooser.disabled = true;
            title.disabled = true;
            streamKey.disabled = true;
            rtmpUrl.disabled = true;
            loop.disabled = true;
            startTime.disabled = true;
            endTime.disabled = true;
            submitButton.disabled = true;

            if (status === "scheduled") {
                this.alertDanger("This live stream is currently " + status + ", you can't edit this live stream until you cancel the schedule.", "alertContainerEditStreamModal");
            } else {
                this.alertDanger("This live stream is currently " + status + ", you can't edit this live stream until you stop it.", "alertContainerEditStreamModal");
            }
        } else {
            streamId.disabled = false;
            videoChooser.disabled = false;
            title.disabled = false;
            streamKey.disabled = false;
            rtmpUrl.disabled = false;
            loop.disabled = false;
            startTime.disabled = false;
            endTime.disabled = false;
            submitButton.disabled = false;

            document.querySelectorAll('.alert').forEach(alert => alert.remove());
        }
    }

    #setEditStreamData(data, mode) {
        if (mode === "web") {
            this.#setEditStreamDataWeb(data);
        } else {
            this.#setEditStreamDataTablet(data);
        }
    }

    async #editStreamGet(streamId) {
        let ret = null;

        this.alertClose();

        try {
            ret = await this.#viewModel.editStreamGet(streamId);
        } catch (error) {
            if (error instanceof Unauthorized) {
                window.location.href = "/login";
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerEditStreamModal");
            } else if (error instanceof Forbidden) {
                this.alertDanger(error.message, "alertContainerEditStreamModal");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error, "alertContainerEditStreamModal");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error, "alertContainerEditStreamModal");
            } else {
                this.alertDanger("Unknown error.", "alertContainerEditStreamModal");
            }

            return null;
        }

        return ret;
    }

    async editStreamModal(streamId, mode) {
        const modalEl = document.getElementById('editStreamModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        const data = await this.#editStreamGet(streamId);

        this.#setEditStreamData(data, mode);

        modal.show();
    }

    async #loadLiveStreams() {
        const data = await this.#getLiveStreams();

        const liveStreamContentContainerWeb = document.getElementById("liveStreamsContentWeb");
        const liveStreamContentContainerTablet = document.getElementById("liveStreamsContentTablet");

        liveStreamContentContainerWeb.replaceChildren();
        liveStreamContentContainerTablet.replaceChildren();

        if (data.length === 0) {
            const liveStreamContentNoContentWeb = `<tr id="liveStreamContentNoContentWeb">
                                                        <td colspan="6">
                                                            <div class="p-5">
                                                                <div class="d-flex align-items-center justify-content-center">
                                                                    <i class="ti ti-broadcast h2"></i>
                                                                </div>
                                                                <div class="">
                                                                    <p class="text-center">No streams found</p>
                                                                    <p class="text-center">Create your first stream to start broadcasting to your audience</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>`;
            const liveStreamContentNoContentTablet = `<div id="liveStreamContentNoContentTablet" class="dashboard-mobile-no-streams-found p-5">
                                                        <div>
                                                            <div>
                                                                <div class="d-flex align-items-center justify-content-center">
                                                                    <i class="ti ti-broadcast h2"></i>
                                                                </div>
                                                                <div class="">
                                                                    <p class="text-center">No streams found</p>
                                                                    <p class="text-center">Create your first stream to start broadcasting to your audience</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>`;
            
            liveStreamContentContainerWeb.insertAdjacentHTML("beforeend", liveStreamContentNoContentWeb);
            liveStreamContentContainerTablet.insertAdjacentHTML("beforeend", liveStreamContentNoContentTablet);
        } else {
            const noContentWeb = document.getElementById("liveStreamContentNoContentWeb");
            const noContentTablet = document.getElementById("liveStreamContentNoContentTablet");

            if (noContentWeb !== null) {
                noContentWeb.remove();
            }

            if (noContentTablet !== null) {
                noContentTablet.remove();
            }
        }

        await this.#liveStreamLooperWeb(data);
        await this.#liveStreamLooperTablet(data);
    }

    async #liveStreamLooperWeb(data) {
        const tbody = document.getElementById("liveStreamsContentWeb");
        let id = null;
        let scheduleStart = null;
        let scheduleEnd = null;
        let startedAt = null;
        let startedAtDate = null;
        let startedAtTime = null;
        let startedAtTimeHours = null;
        let startedAtTimeMinutes = null;
        let startedAtContent = null;
        let dateStartedAt = null;
        let title = null;
        let videoId = null;
        let videoThumbnail = null;
        let videoBitRate = null;
        let videoFrameRate = null;
        let videoWidth = null;
        let videoHeight = null;
        let tr = null;

        this.#allLiveStreamIDs.splice(0, this.#allLiveStreamIDs.length);

        for (let i = 0; i < data.length; i++) {
            id = data[i].live_stream_id;
            scheduleStart = data[i].live_stream_schedule_start;
            scheduleEnd = data[i].live_stream_schedule_end;
            startedAt = data[i].live_stream_started_at;
            title = data[i].live_stream_title;
            videoId = data[i].video_id;
            videoThumbnail = data[i].video_thumbnail == null ? "assets/default-video-thumbnail.svg" : this.#config.HTTP_BACKEND_URL + "/uploads/videos/thumbnails?file=" + data[i].video_thumbnail;
            videoBitRate = data[i].video_bit_rate;
            videoFrameRate = data[i].video_frame_rate;
            videoWidth = data[i].video_width;
            videoHeight = data[i].video_height;

            this.#allLiveStreamIDs.push(data[i].live_stream_id);

            if (startedAt !== null) {
                dateStartedAt = new Date(startedAt * 1000);

                startedAtDate = `${dateStartedAt.toLocaleString('en-US', { month: 'short' })} ${dateStartedAt.getDate()}, ${dateStartedAt.getFullYear()}`;
                
                startedAtTimeHours = dateStartedAt.getHours() < 10 ? `0${dateStartedAt.getHours()}` : `${dateStartedAt.getHours()}`;
                startedAtTimeMinutes = dateStartedAt.getMinutes() < 10 ? `0${dateStartedAt.getMinutes()}` : `${dateStartedAt.getMinutes()}`;

                startedAtTime = `${startedAtTimeHours}:${startedAtTimeMinutes}`;

                startedAtContent = `<span class="small">${startedAtDate}</span>
                                    <span class="extra-small">${startedAtTime}</span>`;
            } else {
                startedAtContent = `<span class="small">--</span>`;
            }

            tr = `<tr id="streamsWebTr-${id}">
                    <td class="align-middle">
                        <div class="d-flex">
                            <div class="me-2 dashoard-stream-video-thumbnail-container">
                                <img src="${videoThumbnail}">
                            </div>
                            <div class="d-flex flex-column mt-auto mb-auto dashoard-stream-video-title-container">
                                <span class="small clamp-2 fw-bold text-primary-color">${title}</span>
                                <span class="extra-small">${videoWidth}x${videoHeight} • ${videoBitRate} kbps • ${videoFrameRate} FPS</span>
                            </div>
                        </div>
                    </td>
                    <td class="align-middle">
                        <div id="liveStreamStartedAtContainerWeb-${id}" class="d-flex flex-column">
                            ${startedAtContent}
                        </div>
                    </td>
                    <td class="align-middle">
                        <div id="liveStreamScheduleContainerWeb-${id}" class="d-flex flex-column">
                            <span class="extra-small">--</span>
                        </div>
                    </td>
                    <td class="align-middle">
                        <div id="liveStreamStatusContainerWeb-${id}" class="dashoard-stream-status w-auto d-inline-flex align-items-center">
                            <i class="ti ti-circle-dot me-1"></i>
                            <span class="extra-small">Offline</span>
                        </div>
                    </td>
                    <td class="align-middle">
                        <div class="d-flex">
                            <div id="liveStreamActionButtonContainerWeb-${id}">
                                <button type="button" class="btn btn-sm btn-primary-custom me-2">Start</button>
                            </div>
                            <div class="mt-auto mb-auto">
                                <a class="text-decoration-none me-2 link-text-color" href="#" onclick="event.preventDefault(); main.view.editStreamModal(${id}, 'web');"><i class="ti ti-edit"></i></a>
                                <a class="text-decoration-none link-text-color red-hover" href="#" onclick="event.preventDefault(); main.view.deleteStreamModal('${id}');"><i class="ti ti-trash"></i></a>
                            </div>
                        </div>
                    </td>
                </tr>`;
            
            tbody.insertAdjacentHTML("beforeend", tr);
        }
    }

    async #liveStreamLooperTablet(data) {
        const container = document.getElementById("liveStreamsContentTablet");
        let content = null;
        let id = null;
        let videoThumbnail = null;
        let title = null;
        let videoWidth = null;
        let videoHeight = null;
        let videoBitRate = null;
        let videoFrameRate = null;
        let startedAt = null;
        let startedAtDate = null;
        let startedAtContent = null;
        let dateStartedAt = null;

        this.#allLiveStreamIDs.splice(0, this.#allLiveStreamIDs.length);

        for (let i = 0; i < data.length; i++) {
            id = data[i].live_stream_id;
            videoThumbnail = data[i].video_thumbnail === null ? "assets/default-video-thumbnail.svg" : this.#config.HTTP_BACKEND_URL + "/uploads/videos/thumbnails?file=" + data[i].video_thumbnail;
            title = data[i].live_stream_title;
            videoWidth = data[i].video_width;
            videoHeight = data[i].video_height;
            videoBitRate = data[i].video_bit_rate;
            videoFrameRate = data[i].video_frame_rate;
            startedAt = data[i].live_stream_started_at;

            this.#allLiveStreamIDs.push(data[i].live_stream_id);

            if (startedAt !== null) {
                dateStartedAt = new Date(startedAt * 1000);

                startedAtDate = `${dateStartedAt.toLocaleString('en-US', { month: 'short' })} ${dateStartedAt.getDate()}, ${dateStartedAt.getFullYear()}`;

                startedAtContent = `<i class="ti ti-calendar"></i>
                                    <span class="small">${startedAtDate}</span>`;
            } else {
                startedAtContent = `<i class="ti ti-calendar"></i>
                                    <span>Not started.</span>`;
            }

            content = `<div class="card video-card mt-3">
                            <div class="video-card-preview position-relative">
                                <div class="video-card-preview-content text-center">
                                    <img class="video-card-thumbnail" src="${videoThumbnail}">
                                </div>
                                <div id="liveStreamStatusTablet-${id}" class="d-flex video-card-stream-status-badge-container position-absolute">
                                    <i class="ti ti-circle-dot mt-auto mb-auto"></i>
                                    <span class="video-card-status-badge">Offline</span>
                                </div>
                            </div>
                            <div class="card-body mt-1">
                                <div>
                                        <h6 class="mb-1 fw-semibold clamp-2">${title}</h6>
                                        <div class="extra-small mt-3">
                                            <span>${videoWidth}×${videoHeight} • ${videoBitRate} kbps • ${videoFrameRate} FPS</span>
                                        </div>
                                        <div id="liveStreamCalendarContainerTablet-${id}" class="meta small mt-2">
                                            ${startedAtContent}
                                        </div>
                                </div>
                                <div class="d-flex justify-content-between align-items-center mt-3">
                                    <div id="liveStreamActionButtonContainerTablet-${id}">
                                        <button class="btn btn-primary-custom btn-sm px-3">
                                            Start
                                        </button>
                                    </div>
                                    <div class="video-card-actions">
                                        <a class="text-decoration-none" href="#" onclick="event.preventDefault(); main.view.editStreamModal('${id}', 'tablet');">
                                            <i class="ti ti-edit"></i>
                                        </a>
                                        <a class="text-decoration-none hover-red" href="#" onclick="event.preventDefault(); main.view.deleteStreamModal('${id}');">
                                            <i class="ti ti-trash"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>`;
            
            container.insertAdjacentHTML("beforeend", content);
        }
    }

    async #getLiveStreams() {
        let ret = null;

        this.alertClose();

        try {
            ret = await this.#viewModel.getLiveStreams();
        } catch (error) {
            if (error instanceof BadRequest) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerDashboard");
            } else if (error instanceof Unauthorized) {
                window.location.href = "/login";
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDashboard");
            } else {
                this.alertDanger("Unknown error.", "alertContainerDashboard");
            }

            return;
        }

        if (ret.response === true) {
            return ret.live_streams;
        } else {
            this.alertDanger("Failed to get live streams.", "alertContainerDashboard");
            
            return null;
        }
    }

    #createStreamValidation(mode) {
        let ret = true;
        const video = mode === "web" ? document.getElementById("createStreamVideoChooserDropdownButtonWeb") : document.getElementById("createStreamVideoChooserDropdownButtonTablet");
        const streamTitle = mode === "web" ? document.getElementById("createStreamStreamTitleWeb") : document.getElementById("createStreamStreamTitleTablet");
        const rtmpUrl = mode === "web" ? document.getElementById("createStreamRtmpUrlWeb") : document.getElementById("createStreamRtmpUrlTablet");
        const streamKey = mode === "web" ? document.getElementById("createStreamStreamKeyWeb") : document.getElementById("createStreamStreamKeyTablet");
        const loopVideoIn = mode === "web" ? document.getElementById("createStreamLoopVideoInWeb") : document.getElementById("createStreamLoopVideoInTablet");
        const streamStartTime = mode === "web" ? document.getElementById("createStreamStartTimeWeb") : document.getElementById("createStreamStartTimeTablet");
        const streamEndTime = mode === "web" ? document.getElementById("createStreamEndTimeWeb") : document.getElementById("createStreamEndTimeTablet");

        const rtmpUrlError = mode === "web" ? document.getElementById("createStreamRtmpUrlWebError") : document.getElementById("createStreamRtmpUrlTabletError");
        const streamKeyError = mode === "web" ? document.getElementById("createStreamStreamKeyWebError") : document.getElementById("createStreamStreamKeyTabletError");
        const loopVideoInError = mode === "web" ? document.getElementById("createStreamLoopVideoInWebError") : document.getElementById("createStreamLoopVideoInTabletError");
        const streamStartTimeError = mode === "web" ? document.getElementById("createStreamStartTimeWebError") : document.getElementById("createStreamStartTimeTabletError");
        const streamEndTimeError = mode === "web" ? document.getElementById("createStreamEndTimeWebError") : document.getElementById("createStreamEndTimeTabletError");

        video.classList.remove("is-invalid");
        streamTitle.classList.remove("is-invalid");
        rtmpUrl.classList.remove("is-invalid");
        streamKey.classList.remove("is-invalid");
        loopVideoIn.classList.remove("is-invalid");
        streamStartTime.classList.remove("is-invalid");
        streamEndTime.classList.remove("is-invalid");

        rtmpUrlError.classList.remove("d-block");
        streamKeyError.classList.remove("d-block");
        loopVideoInError.classList.remove("d-block");
        streamStartTimeError.classList.remove("d-block");
        streamEndTimeError.classList.remove("d-block");

        if (video.value === "" || video.value === null || video.value === undefined) {
            video.classList.add("is-invalid");

            ret = false;
        }

        if (streamTitle.value === "") {
            streamTitle.classList.add("is-invalid");

            ret = false;
        }

        if (rtmpUrl.value === "") {
            rtmpUrl.classList.add("is-invalid");
            rtmpUrlError.classList.add("d-block");

            ret = false;
        }

        if (streamKey.value === "") {
            streamKey.classList.add("is-invalid");
            streamKeyError.classList.add("d-block");

            ret = false;
        }

        if (loopVideoIn.value === "") {
            loopVideoIn.classList.add("is-invalid");
            loopVideoInError.classList.add("d-block");

            ret = false;
        }

        if (streamStartTime.value !== "") {
            const now = parseInt(new Date() / 1000);
            const startTimeUnixTimestamp = parseInt(new Date(streamStartTime.value) / 1000);

            if (startTimeUnixTimestamp < now) {
                streamStartTime.classList.add("is-invalid");
                streamStartTimeError.textContent = "Start time can't be past time. It must be future.";

                ret = false;
            }
        }

        if (streamEndTime.value !== "") {
            const now = parseInt(new Date() / 1000);
            const endTimeUnixTimestamp = parseInt(new Date(streamEndTime.value) / 1000);
            let startTimeUnixTimestamp = null;

            if (streamStartTime.value !== "") {
                startTimeUnixTimestamp = parseInt(new Date(streamStartTime.value) / 1000);
            }

            if (startTimeUnixTimestamp !== null) {
                if (endTimeUnixTimestamp < startTimeUnixTimestamp) {
                    streamEndTime.classList.add("is-invalid");
                    streamEndTimeError.textContent = "End time must be greater than start time.";

                    ret = false;
                }
            } else if (endTimeUnixTimestamp < now) {
                streamEndTime.classList.add("is-invalid");
                streamEndTimeError.textContent = "End time can't be past time. It must be future.";

                ret = false
            }
        }

        return ret;
    }

    #datetimeLocalToUnix(datetimeLocal) {
        const date = new Date(datetimeLocal);
    
        return Math.floor(date.getTime() / 1000);
    }

    #collectDataFromCreateStreamForms(mode) {
        const video = mode === "web" ? document.getElementById("createStreamVideoChooserDropdownButtonWeb").value : document.getElementById("createStreamVideoChooserDropdownButtonTablet").value;
        const streamTitle = mode === "web" ? document.getElementById("createStreamStreamTitleWeb").value : document.getElementById("createStreamStreamTitleTablet").value;
        const rtmpUrl = mode === "web" ? document.getElementById("createStreamRtmpUrlWeb").value : document.getElementById("createStreamRtmpUrlTablet").value;
        const streamKey = mode === "web" ? document.getElementById("createStreamStreamKeyWeb").value : document.getElementById("createStreamStreamKeyTablet").value;
        const loopVideoIn = mode === "web" ? document.getElementById("createStreamLoopVideoInWeb").value : document.getElementById("createStreamLoopVideoInTablet").value;
        const startTime = mode === "web" ? document.getElementById("createStreamStartTimeWeb").value : document.getElementById("createStreamStartTimeTablet").value;
        const endTime = mode === "web" ? document.getElementById("createStreamEndTimeWeb").value : document.getElementById("createStreamEndTimeWeb").value;
        
        const loopVideoInInt = parseInt(loopVideoIn);
        const videoInt = parseInt(video);
        const startTimeUnix = startTime === "" ? null : this.#datetimeLocalToUnix(startTime);
        const endTimeUnix = endTime === "" ? null : this.#datetimeLocalToUnix(endTime);

        const data = {
            title: streamTitle,
            video: videoInt,
            rtmp_url: rtmpUrl,
            stream_key: streamKey,
            stream_loop: loopVideoInInt,
            schedule_start: startTimeUnix,
            schedule_end: endTimeUnix
        };

        return data;
    }

    async createStreamSubmit(mode) {
        const valid = this.#createStreamValidation(mode);

        if (valid) {
            const data = this.#collectDataFromCreateStreamForms(mode);
            const id = await this.#createStream(data);

            if (data.schedule_start !== null) {
                this.scheduleStream(id);
            }
        }
    }

    async #createStream(data) {
        let ret = null;

        this.alertClose();

        try {
            ret = await this.#viewModel.createStream(data);
        } catch (error) {
            if (error instanceof Network) {
                this.alertDanger("Network error.", "alertContainerCreateNewStreamModal");
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerCreateNewStreamModal");
            } else if (error instanceof Unauthorized) {
                window.location.href = "/login";
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerCreateNewStreamModal");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerCreateNewStreamModal");
            } else if (error instanceof BadRequest) {
                this.alertDanger(error.response.error + ".", "alertContainerCreateNewStreamModal");
            } else {
                this.alertDanger("Unknown error.", "alertContainerCreateNewStreamModal");
            }

            return;
        }

        if (ret.create > 0) {
            const modalEl = document.getElementById('newStreamModal');
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

            this.alertSuccess("Successfully create a live stream.", "alertContainerDashboard");
            modal.hide();
            this.#loadLiveStreams();

            return ret.create;
        } else {
            this.alertSuccess("Failed create a live stream.", "alertContainerDashboard");

            return 0;
        }
    }

    #createStreamVideoChooserSearchDebounce(fn, delay = 500) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    #createStreamVideoChooserLiveSearchListener(mode) {
        const searchFormId = mode === "web" ? "crateStreamVideoChooserSearchWeb" : "crateStreamVideoChooserSearchTablet";
        const input = document.getElementById(searchFormId);

        const search = this.#createStreamVideoChooserSearchDebounce(async (keyword) => {
            if (this.#createStreamVideoChooserSearchController) {
                this.#createStreamVideoChooserSearchController.abort();
            }

            this.#createStreamVideoChooserSearchController = new AbortController();

            if (!keyword.trim()) {
                const data = await this.#getVideosForVideoChooserDropdownMenu();
                
                this.#createStreamVideoChooserDropdownMenuLooper(data, mode);
            } else {
                const data = await this.#searchVideoForVideoChooserDropdownMenu(this.#createStreamVideoChooserSearchController.signal, keyword);
                
                this.#createStreamVideoChooserDropdownMenuLooper(data, mode);
            }
        }, 500);

        input.addEventListener('input', (e) => {
            search(e.target.value);
        });
    }

    #createStreamModalCloseListener() {
        const modalEl = document.getElementById('newStreamModal');
        
        modalEl.addEventListener('hidden.bs.modal', () => {
            if (this.#createStreamVideoPlayerWeb) {
                this.#createStreamVideoPlayerWeb.pause();
                this.#createStreamVideoPlayerWeb.currentTime(0);
            }

            if (this.#createStreamVideoPlayerTablet) {
                this.#createStreamVideoPlayerTablet.pause();
                this.#createStreamVideoPlayerTablet.currentTime(0);
            }
        });
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
        return `${minutes}:${ss}`;
    }

    #editStreamVideoChooserSearchDebounce(fn, delay = 500) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    #editStreamVideoChooserLiveSearchListener(mode) {
        const searchFormId = mode === "web" ? "editStreamVideoChooserSearchWeb" : "editStreamVideoChooserSearchTablet";
        const input = document.getElementById(searchFormId);

        const search = this.#editStreamVideoChooserSearchDebounce(async (keyword) => {
            if (this.#createStreamVideoChooserSearchController) {
                this.#createStreamVideoChooserSearchController.abort();
            }

            this.#createStreamVideoChooserSearchController = new AbortController();

            if (!keyword.trim()) {
                const data = await this.#getVideosForVideoChooserDropdownMenu();
                
                this.#editStreamVideoChooserDropdownMenuLooper(data, mode);
            } else {
                const data = await this.#searchVideoForVideoChooserDropdownMenu(this.#createStreamVideoChooserSearchController.signal, keyword);
                
                this.#editStreamVideoChooserDropdownMenuLooper(data, mode);
            }
        }, 500);

        input.addEventListener('input', (e) => {
            search(e.target.value);
        });
    }

    async #editStreamVideoChooserDropdownListener(mode) {
        const dropdownButtonId = mode === "web" ? "editStreamVideoChooserDropdownButtonWeb" : "editStreamVideoChooserDropdownButtonTablet";
        const dropdownButton = document.getElementById(dropdownButtonId);

        dropdownButton.addEventListener('shown.bs.dropdown', async () => {
            const data = await this.#getVideosForVideoChooserDropdownMenu();

            this.#editStreamVideoChooserDropdownMenuLooper(data, mode);
        });
    }

    async #editStreamVideoChooserDropdownMenuLooper(data, mode) {
        const ulId = mode === "web" ? "editStreamVideoChooserDropdownMenuWeb" : "editStreamVideoChooserDropdownMenuTablet";
        const ul = document.getElementById(ulId);
        const ulChildren = ul.children;
        let thumbnail = null;
        let title = null;
        let resolution = null;
        let id = null;
        let file = null;
        let li = null;
        let formatedTime = null;

        if (data === null || data === undefined) {
            return;
        }

        // Remove from the end to avoid index shifting
        for (let i = ulChildren.length - 1; i >= 2; i--) {
            ulChildren[i].remove();
        }

        if (data.length === 0) {
            let noVideo = `<div class="ms-3 mt-3 me-3 mb-3 text-center">No videos.</div>`;

            ul.insertAdjacentHTML("beforeend", noVideo);
        }
        
        for (let i = 0; i < data.length; i++) {
            title = data[i].title;
            thumbnail = this.#config.HTTP_BACKEND_URL + "/uploads/videos/thumbnails?file=" + data[i].thumbnail;
            resolution = data[i].width + "x" + data[i]. height;
            id = data[i].id;
            file = data[i].file;
            formatedTime = this.#formatTime(data[i].length);
            li = `<li class="" onclick="main.view.editStreamVideoChooserDropdownSelectVideo('${id}', '${title}', '${file}', '${mode}');">
                    <div class="dropdown-item d-flex">
                        <div class="me-2 dashboard-modal-video-chooser-thumbnail-container">
                            <img src="${thumbnail}">
                        </div>
                        <div class="dashboard-modal-video-chooser-dropdown-menu-video-info d-flex flex-column mt-auto mb-auto">
                            <span class="small text-primary-color dashboard-modal-video-chooser-dropdown-menu-video-title">${title}</span>
                            <span class="extra-small">${resolution} • ${formatedTime} </span>
                        </div>
                    </div>
                </li>`;
            
            ul.insertAdjacentHTML("beforeend", li);
        }
    }

    editStreamVideoChooserDropdownSelectVideo(id, title, file, mode) {
        const dropdownId = mode === "web" ? "editStreamVideoChooserDropdownButtonWeb" : "editStreamVideoChooserDropdownButtonTablet";
        const chooseVideoButton = document.getElementById(dropdownId);
        const videoPreviewId = mode === "web" ? "createStreamVideoPreviewWeb" : "createStreamVideoPreviewTablet";
        const videoPreviewContainer = document.getElementById(videoPreviewId);
        const videoUrl = this.#config.HTTP_BACKEND_URL + "/uploads/videos?file=" + file;
        const videoMime = Video.guessVideoMimeType(videoUrl);
        let videoPlayer = null;

        if (mode === "web") {
            videoPlayer = `<video
                                id="editStreamVideoPlayerWeb"
                                class="video-js vjs-default-skin vjs-fluid create-stream-video-player"
                                controls
                                preload="auto"
                                data-setup="{}"
                            >
                                <p class="vjs-no-js">
                                To view this video please enable JavaScript, and consider upgrading to a
                                web browser that
                                <a href="https://videojs.com/html5-video-support/" target="_blank"
                                    >supports HTML5 video</a
                                >
                                </p>
                            </video>`;
        } else {
            videoPlayer = `<video
                                id="editStreamVideoPlayerTablet"
                                class="video-js vjs-default-skin vjs-fluid create-stream-video-player"
                                controls
                                preload="auto"
                                data-setup="{}"
                            >
                                <p class="vjs-no-js">
                                To view this video please enable JavaScript, and consider upgrading to a
                                web browser that
                                <a href="https://videojs.com/html5-video-support/" target="_blank"
                                    >supports HTML5 video</a
                                >
                                </p>
                            </video>`;
        }

        chooseVideoButton.value = id;
        chooseVideoButton.textContent = title;

        if (mode === "web") {
            if (this.#editStreamVideoPlayerWeb === null) {
                videoPreviewContainer.replaceChildren();
                videoPreviewContainer.insertAdjacentHTML("beforeend", videoPlayer);

                this.#editStreamVideoPlayerWeb = videojs("createStreamVideoPlayerWeb");
            }

            this.#editStreamVideoPlayerWeb.src({
                src: videoUrl,
                type: videoMime
            });
        } else {
            if (this.#editStreamVideoPlayerTablet === null) {
                videoPreviewContainer.replaceChildren();
                videoPreviewContainer.insertAdjacentHTML("beforeend", videoPlayer);

                this.#editStreamVideoPlayerTablet = videojs("createStreamVideoPlayerTablet");
            }

            this.#editStreamVideoPlayerTablet.src({
                src: videoUrl,
                type: videoMime
            });
        }

        //this.#createStreamVideoPlayer.load();
        
    }

    createStreamVideoChooserDropdownSelectVideo(id, title, file, mode) {
        const dropdownId = mode === "web" ? "createStreamVideoChooserDropdownButtonWeb" : "createStreamVideoChooserDropdownButtonTablet";
        const chooseVideoButton = document.getElementById(dropdownId);
        const videoPreviewId = mode === "web" ? "createStreamVideoPreviewWeb" : "createStreamVideoPreviewTablet";
        const videoPreviewContainer = document.getElementById(videoPreviewId);
        const videoUrl = this.#config.HTTP_BACKEND_URL + "/uploads/videos?file=" + file;
        const videoMime = Video.guessVideoMimeType(videoUrl);
        let videoPlayer = null;

        if (mode === "web") {
            videoPlayer = `<video
                                id="createStreamVideoPlayerWeb"
                                class="video-js vjs-default-skin vjs-fluid create-stream-video-player"
                                controls
                                preload="auto"
                                data-setup="{}"
                            >
                                <p class="vjs-no-js">
                                To view this video please enable JavaScript, and consider upgrading to a
                                web browser that
                                <a href="https://videojs.com/html5-video-support/" target="_blank"
                                    >supports HTML5 video</a
                                >
                                </p>
                            </video>`;
        } else {
            videoPlayer = `<video
                                id="createStreamVideoPlayerTablet"
                                class="video-js vjs-default-skin vjs-fluid create-stream-video-player"
                                controls
                                preload="auto"
                                data-setup="{}"
                            >
                                <p class="vjs-no-js">
                                To view this video please enable JavaScript, and consider upgrading to a
                                web browser that
                                <a href="https://videojs.com/html5-video-support/" target="_blank"
                                    >supports HTML5 video</a
                                >
                                </p>
                            </video>`;
        }

        chooseVideoButton.value = id;
        chooseVideoButton.textContent = title;

        if (mode === "web") {
            if (this.#createStreamVideoPlayerWeb === null) {
                videoPreviewContainer.replaceChildren();
                videoPreviewContainer.insertAdjacentHTML("beforeend", videoPlayer);

                this.#createStreamVideoPlayerWeb = videojs("createStreamVideoPlayerWeb");
            }

            this.#createStreamVideoPlayerWeb.src({
                src: videoUrl,
                type: videoMime
            });
        } else {
            if (this.#createStreamVideoPlayerTablet === null) {
                videoPreviewContainer.replaceChildren();
                videoPreviewContainer.insertAdjacentHTML("beforeend", videoPlayer);

                this.#createStreamVideoPlayerTablet = videojs("createStreamVideoPlayerTablet");
            }

            this.#createStreamVideoPlayerTablet.src({
                src: videoUrl,
                type: videoMime
            });
        }

        //this.#createStreamVideoPlayer.load();
        
    }

    #createStreamVideoChooserDropdownListener(mode) {
        const dropdownButtonId = mode === "web" ? "createStreamVideoChooserDropdownButtonWeb" : "createStreamVideoChooserDropdownButtonTablet";
        const dropdownButton = document.getElementById(dropdownButtonId);

        dropdownButton.addEventListener('shown.bs.dropdown', async () => {
            const data = await this.#getVideosForVideoChooserDropdownMenu();

            this.#createStreamVideoChooserDropdownMenuLooper(data, mode);
        });
    }

    #createStreamVideoChooserDropdownMenuLooper(data, mode) {
        const ulId = mode === "web" ? "createStreamVideoChooserDropdownMenuWeb" : "createStreamVideoChooserDropdownMenuTablet";
        const ul = document.getElementById(ulId);
        const ulChildren = ul.children;
        let thumbnail = null;
        let title = null;
        let resolution = null;
        let id = null;
        let file = null;
        let li = null;
        let formatedTime = null;

        if (data === null || data === undefined) {
            return;
        }

        // Remove from the end to avoid index shifting
        for (let i = ulChildren.length - 1; i >= 2; i--) {
            ulChildren[i].remove();
        }

        if (data.length === 0) {
            let noVideo = `<div class="ms-3 mt-3 me-3 mb-3 text-center">No videos.</div>`;

            ul.insertAdjacentHTML("beforeend", noVideo);
        }
        
        for (let i = 0; i < data.length; i++) {
            title = data[i].title;
            thumbnail = this.#config.HTTP_BACKEND_URL + "/uploads/videos/thumbnails?file=" + data[i].thumbnail;
            resolution = data[i].width + "x" + data[i]. height;
            id = data[i].id;
            file = data[i].file;
            formatedTime = this.#formatTime(data[i].length);
            li = `<li class="" onclick="main.view.createStreamVideoChooserDropdownSelectVideo('${id}', '${title}', '${file}', '${mode}');">
                    <div class="dropdown-item d-flex">
                        <div class="me-2 dashboard-modal-video-chooser-thumbnail-container">
                            <img src="${thumbnail}">
                        </div>
                        <div class="dashboard-modal-video-chooser-dropdown-menu-video-info d-flex flex-column mt-auto mb-auto">
                            <span class="small text-primary-color dashboard-modal-video-chooser-dropdown-menu-video-title">${title}</span>
                            <span class="extra-small">${resolution} • ${formatedTime} </span>
                        </div>
                    </div>
                </li>`;
            
            ul.insertAdjacentHTML("beforeend", li);
        }
    }

    async #searchVideoForVideoChooserDropdownMenu(signal, keyword) {
        let ret = null;

        this.alertClose();

        try {
            ret = await this.#viewModel.searchVideoChooseVideo(signal, keyword);
        } catch (error) {
            if (error instanceof Unauthorized) {
                window.location.href = "/login";
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerCreateNewStreamModal");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerCreateNewStreamModal");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerCreateNewStreamModal");
            } else {
                this.alertDanger("Unknown error.", "alertContainerCreateNewStreamModal");
            }
        }

        if (ret.response === true) {
            return ret.data;
        } else {
            this.alertDanger("Failed to get videos.", "alertContainerCreateNewStreamModal");
        }
    }

    async #getVideosForVideoChooserDropdownMenu() {
        let ret = null;

        this.alertClose();

        try {
            ret = await this.#viewModel.getVideosChooseVideo();
        } catch (error) {
            if (error instanceof Unauthorized) {
                window.location.href = "/login";
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerCreateNewStreamModal");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerCreateNewStreamModal");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerCreateNewStreamModal");
            } else {
                this.alertDanger("Unknown error.", "alertContainerCreateNewStreamModal");
            }

            return;
        }

        if (ret.response === true) {
            return ret.data;
        } else {
            this.alertDanger("Failed to get videos.", "alertContainerCreateNewStreamModal");
        }
    }

    showCheckCredentialsNetworkErrorToast() {
        const toastEl = document.getElementById('checkCredentialNetworkErrorToast');
        const toast = new bootstrap.Toast(toastEl, { autohide: false });
        
        toast.show();
    }

    showLiveStreamMonitorWebsocketConnectionErrorToast() {
        const toastEl = document.getElementById('liveStreamMonitorWebsocketConnectionErrorToast');
        const toast = new bootstrap.Toast(toastEl, { autohide: false });
        
        toast.show();
    }

    showLiveStreamMonitorWebsocketConnectionClosedToast() {
        const toastEl = document.getElementById('liveStreamMonitorWwebsocketConnectionClosedToast');
        const toast = new bootstrap.Toast(toastEl, { autohide: false });
        
        toast.show();
    }

    showSystemMonitorWebsocketConnectionErrorToast() {
        const toastEl = document.getElementById('systemMonitorWebsocketConnectionErrorToast');
        const toast = new bootstrap.Toast(toastEl, { autohide: false });
        
        toast.show();
    }

    showSystemMonitorWebsocketConnectionClosedToast() {
        const toastEl = document.getElementById('systemMonitorWebsocketConnectionClosedToast');
        const toast = new bootstrap.Toast(toastEl, { autohide: false });
        
        toast.show();
    }

    #setActiveStreams(activeStreams) {
        const cpuUsageText = document.getElementById("activeStreamsText");

        cpuUsageText.textContent = activeStreams;
    }

    #setCpuUsage(cpuUsage) {
        const cpuUsageText = document.getElementById("cpuUsageText");
        const cpuUsageProgressBar = document.getElementById("cpuUsageProgressBar");

        cpuUsageText.textContent = Math.floor(cpuUsage) + "%";
        cpuUsageProgressBar.style.width = Math.floor(cpuUsage) + '%';
        cpuUsageProgressBar.setAttribute('aria-valuenow', Math.floor(cpuUsage));
    }

    #setMemoryUsage(usedMemory, availableMemory) {
        const usedMemoryText = document.getElementById("usedMemory");
        const availableMemoryText = document.getElementById("availableMemory");
        const memoryUsageProgressBar = document.getElementById("memoryUsageProgressBar");
        const memoryUsageInPercent = (usedMemory / (usedMemory + availableMemory)) * 100;
        const usedMemoryFormatSize = this.#formatSize(usedMemory);
        const availableMemoryFormatSize = this.#formatSize(availableMemory);

        usedMemoryText.textContent = usedMemoryFormatSize.size + " " + usedMemoryFormatSize.unit;
        availableMemoryText.textContent = "/" + availableMemoryFormatSize.size + " " + availableMemoryFormatSize.unit;
        memoryUsageProgressBar.style.width = Math.floor(memoryUsageInPercent) + "%";
        memoryUsageProgressBar.setAttribute('aria-valuenow', Math.floor(memoryUsageInPercent));
    }

    #internetSpeed(download, upload) {
        const uploadText = document.getElementById("internetSpeedUpload");
        const downloadText = document.getElementById("internetSpeedDownload");
        const uploadFormatSize = this.#formatSize(upload);
        const downloadFormatSize = this.#formatSize(download);
        
        uploadText.textContent = uploadFormatSize.size + " " + uploadFormatSize.unit + "ps";
        downloadText.textContent = downloadFormatSize.size + " " + downloadFormatSize.unit + "ps";
    }

    #bandwidthUsage(usage) {
        const bandwitdhText = document.getElementById("bandwidth");
        const usageFormatSize = this.#formatSize(usage);

        bandwitdhText.textContent = usageFormatSize.size + " " + usageFormatSize.unit;
    }

    #diskUsage(used, available) {
        const diskUsageUsed = document.getElementById("diskUsageUsed");
        const diskUsageAvailable = document.getElementById("diskUsageAvailable");
        const diskUsageProgressBar = document.getElementById("diskUsageProgressBar");
        const usedFormatSize = this.#formatSize(used);
        const availableFormatSize = this.#formatSize(available);
        const diskUsageInPercent = (used / (used + available)) * 100;

        diskUsageUsed.textContent = Math.floor(usedFormatSize.size) + " " + usedFormatSize.unit;
        diskUsageAvailable.textContent = "/" + availableFormatSize.size + " " + availableFormatSize.unit;
        diskUsageProgressBar.style.width = Math.floor(diskUsageInPercent) + "%";
        diskUsageProgressBar.setAttribute('aria-valuenow', Math.floor(diskUsageInPercent));
    }

    #formatSize(value) {
        const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
        let size = value;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return {
            size: parseFloat(size.toFixed(2)),
            unit: units[unitIndex]
        };
    }

    editStreamIncreaseLoopVideoIn(mode) {
        const inputId = mode === "web" ? "editStreamLoopVideoInWeb" : "editStreamLoopVideoInTablet";
        const val = document.getElementById(inputId);
        const valInt = parseInt(val.value);

        val.value = valInt + 1;
    }

    editStreamDecreaseLoopVideoIn(mode) {
        const inputId = mode === "web" ? "editStreamLoopVideoInWeb" : "editStreamLoopVideoInTablet";
        const val = document.getElementById(inputId);
        const valInt = parseInt(val.value);

        if (valInt <= 1) {
            return;
        }

        val.value = valInt - 1;
    }

    createStreamIncreaseLoopVideoIn(mode) {
        const inputId = mode === "web" ? "createStreamLoopVideoInWeb" : "createStreamLoopVideoInTablet";
        const val = document.getElementById(inputId);
        const valInt = parseInt(val.value);

        val.value = valInt + 1;
    }

    createStreamDecreaseLoopVideoIn(mode) {
        const inputId = mode === "web" ? "createStreamLoopVideoInWeb" : "createStreamLoopVideoInTablet";
        const val = document.getElementById(inputId);
        const valInt = parseInt(val.value);

        if (valInt <= 1) {
            return;
        }

        val.value = valInt - 1;
    }

    #editStreamHideAndShowStreamKeyListener(mode) {
        const passwordInputId = mode === "web" ? "editStreamStreamKeyWeb" : "editStreamStreamKeyTablet";
        const passwordInput = document.getElementById(passwordInputId);
        const toggleBtnId = mode === "web" ? "editStreamToggleStreamKeyWeb" : "editStreamToggleStreamKeyTablet";
        const toggleBtn = document.getElementById(toggleBtnId);

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

    #createStreamHideAndShowStreamKeyListener(mode) {
        const passwordInputId = mode === "web" ? "createStreamStreamKeyWeb" : "createStreamStreamKeyTablet";
        const passwordInput = document.getElementById(passwordInputId);
        const toggleBtnId = mode === "web" ? "createStreamToggleStreamKeyWeb" : "createStreamToggleStreamKeyTablet";
        const toggleBtn = document.getElementById(toggleBtnId);

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