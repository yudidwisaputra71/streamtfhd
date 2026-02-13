'use strict';

import { Forbidden } from "../Errors/Forbidden.js";
import { Http } from "../Errors/Http.js";
import { InternalServerError } from "../Errors/InternalServerError.js";
import { Network } from "../Errors/Network.js";
import { Unauthorized } from "../Errors/Unauthorized.js";
import { UnprocessableContent } from "../Errors/UnprocessableContent.js";
import { Conflict } from "../Errors/Conflict.js";
import { User } from "../Utils/User.js";
import { GalleryViewModel } from "../ViewModel/GalleryViewModel.js";
import { Video } from "../Utils/Video.js";

export class GalleryView {
    #config = null;
    #viewModel = null;
    #page = 1;
    #pageSize = 12;
    #totaVideos = 0;
    #order = "newest";
    #renameVideo = null;
    #deleteVideo = 0;
    #searchMode = false;
    #gallerySearchController;
    #searchResult = [];
    #videoPlayer;

    constructor(config) {
        this.#config = config;
        this.#viewModel = new GalleryViewModel(this.#config);

        this.#checkCredentials();

        this.#setAvatar();

        this.#loadVideos(this.#page);

        this.#gridOrListViewButtonListener();
        this.#uploadVideosHandler();

        this.#galleryLiveSearch();
        this.#importFromDriveButtonListener();
        this.#videoPlayerModalCloseListener();
    }

    async #checkCredentials() {
        let cred = null;

        try {
            cred = await User.checkCredentials();
        } catch (error) {
            if (error instanceof Network) {
                this.alertDanger("Failed to check credentials.", "alertContainerVideoGallery");
            } else {
                this.alertDanger("Failed to check credentials.", "alertContainerVideoGallery");
            }
        }

        if (cred !== null && cred === false) {
            const redirecTo = encodeURIComponent("/gallery");
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

    #videoPlayerModalCloseListener() {
        const modalEl = document.getElementById('videoPlayerModal');
        
        modalEl.addEventListener('hidden.bs.modal', () => {
            if (this.#videoPlayer) {
                this.#videoPlayer.pause();
                this.#videoPlayer.currentTime(0);
            }
        });
    }

    playVideo(videoSrc, videoTitle) {
        const modalEl = document.getElementById('videoPlayerModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        const playerTitle = document.getElementById("videoPlayerModalTitle");
        const videoMime = Video.guessVideoMimeType(videoSrc);

        playerTitle.textContent = videoTitle;

        if (!this.#videoPlayer) {
            this.#videoPlayer = videojs("videoPlayer");
        }

        this.#videoPlayer.src({
            src: videoSrc,
            type: videoMime
        });

        this.#videoPlayer.load();   // optional (video.js usually auto-loads)
        this.#videoPlayer.play();   // optional (auto-play new video)

        modal.show();
    }

    #importFromDriveButtonListener() {
        document.getElementById('importFromDriveButton').addEventListener('click', () => {
            const validation = this.#importFromDriveFormValidation();

            if (validation === true) {
                this.#importFromDrive();
            }
        });
    }

    #importFromDriveFormValidation() {
        let ret = true;
        const form = document.getElementById("importFromDriveForm");

        if (form.value === null || form.value === "") {
            this.alertClose();
            this.alertDanger("Google Drive URL is empty.", "alertContainerImportFromDrive");

            ret = false;
        }

        return ret;
    }

    async #importFromDrive() {
        const googleDriveUrl = document.getElementById("importFromDriveForm").value;
        const button = document.getElementById("importFromDriveButton");
        const buttonLoading = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>' +
                                '<span role="status">  Importing video...</span>';
        const buttonNormal = '<i class="ti ti-download"></i> Import Video';
        const modalEl = document.getElementById('googleDriveImportModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        const input = document.getElementById("importFromDriveForm");
        let ret = null;

        this.alertClose();

        button.replaceChildren();
        button.insertAdjacentHTML("beforeend", buttonLoading);

        try {
            ret = await this.#viewModel.importFromDrive(googleDriveUrl);
        } catch (error) {
            if (error instanceof Unauthorized) {
                const redirecTo = encodeURIComponent("/gallery");

                window.location.href = "/login?redirect_to=" + redirecTo;
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerImportFromDrive");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerImportFromDrive");
            } else if (error instanceof UnprocessableContent) {
                this.alertDanger(error.response.error + ".", "alertContainerImportFromDrive");
            } else if (error instanceof TypeError) {
                this.alertDanger("Failed to connect to backend.", "alertContainerImportFromDrive");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerImportFromDrive");
            } else {
                this.alertDanger("Unknwon error.", "alertContainerImportFromDrive");
            }

            button.replaceChildren();
            button.insertAdjacentHTML("beforeend", buttonNormal);

            return;
        }

        if (ret.import === true) {
            button.replaceChildren();
            button.insertAdjacentHTML("beforeend", buttonNormal);
            modal.hide();

            if (this.#searchMode === false) {
                this.#loadVideos(1);
            }

            input.value = "";
            this.alertSuccess("The video was successfully imported from Google Drive.", "alertContainerVideoGallery");
        } else {
            button.replaceChildren();
            button.insertAdjacentHTML("beforeend", buttonNormal);
            this.alertDanger("Unknwon error.", "alertContainerImportFromDrive");
        }
    }

    #galleryLiveSearchDebounce(fn, delay = 500) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    async #galleryLiveSearch() {
        const input = document.getElementById('gallerySearch');
        const galleryDataView = document.getElementById("galleryDataView");

        const search = this.#galleryLiveSearchDebounce(async (query) => {
            let res = null;

            if (this.#gallerySearchController) {
                this.#gallerySearchController.abort();
            }

            this.#gallerySearchController = new AbortController();

            if (!query.trim()) {
                this.#searchMode = false;
                this.#searchResult = [];
                this.#loadVideos(1);

                return;
            }

            this.alertClose();

            try {
                res = await this.#viewModel.searchVideo(this.#gallerySearchController.signal, query);
            } catch (error) {
                if (error instanceof Unauthorized) {
                    const redirecTo = encodeURIComponent("/gallery");

                    window.location.href = "/login?redirect_to=" + redirecTo;
                } else if (error instanceof InternalServerError) {
                    this.alertDanger(error.response.error + ".", "alertContainerVideoGallery");
                } else if (error instanceof Http) {
                    this.alertDanger(error.response.error + ".", "alertContainerVideoGallery");
                } else if (error instanceof Network) {
                    this.alertDanger("Failed to connect to backend.", "alertContainerVideoGallery");
                } else {
                    this.alertDanger("Unknown error.", "alertContainerVideoGallery");
                }

                return;
            }

            galleryDataView.replaceChildren();
            this.#searchMode = true;
            this.#searchResult = res.data;
            this.#searchVideoLooper(res.data);
        }, 500);

        input.addEventListener('input', (e) => {
            search(e.target.value);
        });
    }

    async deleteAllVideos() {
        const modalEl = document.getElementById('deleteAllVideoModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        let ret = null;

        this.alertClose();

        try {
            ret = await this.#viewModel.deleteAllVideos();
        } catch (error) {
            if (error instanceof Unauthorized) {
                const redirecTo = encodeURIComponent("/gallery");

                window.location.href = "/login?redirect_to=" + redirecTo;
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerDeleteAllVideos");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDeleteAllVideos");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDeleteAllVideos");
            } else {
                this.alertDanger("Unknown error.", "alertContainerDeleteAllVideos");
            }

            return;
        }

        if (ret.delete === true) {
            this.alertSuccess(ret.message, "alertContainerVideoGallery");
            this.#refreshGalleryContent(1);

            modal.hide();
        } else {
            this.alertSuccess("Failed to delete videos.", "alertContainerVideoGallery");
        }
    }

    deleteVideoModal(videoId) {
        const modalEl = document.getElementById('deleteVideoModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

        this.#deleteVideo = videoId;

        this.alertClose();

        modal.show();
    }

    async deleteVideo() {
        let ret = null;

        this.alertClose();

        try {
            ret = await this.#viewModel.deleteVideo(this.#deleteVideo);
        } catch (error) {
            if (error instanceof Unauthorized) {
                const redirecTo = encodeURIComponent("/gallery");

                window.location.href = "/login?redirect_to=" + redirecTo;
            } else if (error instanceof Network) {
                this.alertDanger(error.message + ".", "alertContainerDeleteVideo");
            } else if (error instanceof Forbidden) {
                this.alertDanger("You don't have credentials to do this action.", "alertContainerDeleteVideo");
            } else if (error instanceof Conflict) {
                this.alertDanger(error.response.error + ".", "alertContainerDeleteVideo");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerDeleteVideo");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerDeleteVideo");
            } else {
                this.alertDanger("Unknown error.", "alertContainerDeleteVideo");
            }

            return;
        }

        if (ret.response === true) {
            if (ret.delete === true) {
                const modalEl = document.getElementById('deleteVideoModal');
                const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

                this.#refreshGalleryContent(this.#page);

                this.alertSuccess("The video was deleted.", "alertContainerVideoGallery");

                modal.hide();
            } else {
                this.alertDanger("Failed to delete video.", "alertContainerVideoGallery");
            }
        } else {
            this.alertDanger("Failed to delete video.", "alertContainerVideoGallery");
        }
    }

    renameVideoModal(videoId, videoName) {
        const modalEl = document.getElementById('renameVideoModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        const renameVideoId = document.getElementById("renameVideoId");
        const renameVideoName = document.getElementById("renameVideoName");

        this.alertClose();

        modal.show();

        renameVideoId.value = videoId;
        renameVideoName.value = videoName;
    }

    async renameVideo() {
        const renameVideoId = document.getElementById("renameVideoId").value;
        const renameVideoName = document.getElementById("renameVideoName").value;
        let ret = null;

        this.alertClose();

        if (renameVideoName === "") {
            this.alertDanger("Video name can't be empty.", "alertContainerRenameVideo");

            return;
        } else if (renameVideoId === "") {
            this.alertDanger("Video ID can't be empty.", "alertContainerRenameVideo");

            return;
        }

        try {
            ret = await this.#viewModel.renameVideo(renameVideoId, renameVideoName);
        } catch (error) {
            if (error instanceof Network) {
                this.alertDanger("Failed to connect to backend.", "alertContainerRenameVideo");
            } else if (error instanceof Unauthorized) {
                const redirecTo = encodeURIComponent("/gallery");

                window.location.href = "/login?redirect_to=" + redirecTo;
            } else if (error instanceof Forbidden) {
                this.alertDanger("You don't have credentials to do this action.", "alertContainerRenameVideo");
            } else if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerRenameVideo");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerRenameVideo");
            } else {
                this.alertDanger("Unknown error.", "alertContainerRenameVideo");
            }

            return;
        }

        if (ret.response === true) {
            if (ret.rename === true) {
                const modalEl = document.getElementById('renameVideoModal');
                const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

                this.#refreshGalleryContent(this.#page);

                this.alertSuccess(ret.message, "alertContainerVideoGallery");

                modal.hide();
            } else {
                this.alertDanger("Failed to rename video.", "alertContainerVideoGallery");
            }
        } else {
            this.alertDanger("Failed to rename video.", "alertContainerVideoGallery");
        }
    }

    /**
     * Calculate visible page numbers
     */
    #getVisiblePages(current, total, range = 2) {
        const pages = [];

        const start = Math.max(2, current - range);
        const end = Math.min(total - 1, current + range);

        pages.push(1);

        if (start > 2) pages.push('...');

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < total - 1) pages.push('...');

        if (total > 1) pages.push(total);

        return pages;
    }

    #hidePagination() {
        document.getElementById('pagination').hidden = true;
    }

    #renderPagination(totalPages, currentPage) {
        const ul = document.getElementById('pagination');

        ul.hidden = false;
        ul.innerHTML = '';

        // Prev
        ul.appendChild(
            this.#createPageItem('Prev', currentPage === 1, () => this.#loadVideos(currentPage - 1))
        );

        // Page numbers
        const pages = this.#getVisiblePages(currentPage, totalPages);

        pages.forEach(p => {
            if (p === '...') {
            const li = document.createElement('li');
            li.className = 'page-item disabled';
            li.innerHTML = `<span class="page-link">…</span>`;
            ul.appendChild(li);
            } else {
            ul.appendChild(
                this.#createPageItem(p, false, () => this.#loadVideos(p), p === currentPage)
            );
            }
        });

        // Next
        ul.appendChild(
            this.#createPageItem(
                'Next',
                currentPage === totalPages,
                () => this.#loadVideos(currentPage + 1)
            )
        );
    }

    #createPageItem(label, disabled, onClick, active = false) {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${
            active ? 'active' : ''
        }`;

        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = label;

        a.onclick = e => {
            e.preventDefault();
            if (!disabled) onClick();
        };

        li.appendChild(a);
        return li;
    }

    #capitalize(word) {
        return word ? word[0].toLocaleUpperCase() + word.slice(1) : word;
    }

    videoViewOrder(order) {
        const galleryContentContainer = document.getElementById("galleryDataView");
        const videoOrderButton = document.getElementById("videosOrderButton");

        galleryContentContainer.replaceChildren();
        videoOrderButton.textContent = this.#capitalize(order);

        this.#order = order;

        if (this.#searchMode === true) {
            this.#searchVideoLooper(this.#searchResult);
        } else {
            this.#loadVideos(this.#page);
        }
    }

    #refreshGalleryContent(page) {
        const galleryContentContainer = document.getElementById("galleryDataView");
        const noVideosGallery = document.getElementById("noVideosGallery");

        galleryContentContainer.replaceChildren();

        if (noVideosGallery !== null) {
            noVideosGallery.remove();
        }

        if (page === undefined) {
            page = 1;
        }

        this.#loadVideos(page);
    }

    #videoLooper(data) {
        const galleryContentContainer = document.getElementById("galleryDataView");
        const galleryContainer = document.getElementById("galleryContainer");

        if (data.length === 0) {
            let galleryItem = '<div id="noVideosGallery" class="col-12 mt-5 w-100">' +
                                    '<p class="text-center h4">No videos yet</p>' +
                                    '<p class="text-center">Upload your first video to get started</p>' +
                                '</div>';
            galleryContainer.insertAdjacentHTML('beforeend', galleryItem);

            return;
        }

        for (let i = 0; i < data.length; i++) {
            const videoSize = this.#formatSize(data[i].size);
            const dateObj = new Date(data[i].uploaded_at * 1000);
            const date = dateObj.getDate();
            const month = dateObj.toLocaleString('en-US', { month: 'short' });
            const year = dateObj.getFullYear();
            const videoThumbnail = this.#config.HTTP_BACKEND_URL + "/uploads/videos/thumbnails?file=" + data[i].thumbnail;
            const videoFile = this.#config.HTTP_BACKEND_URL + "/uploads/videos?file=" + data[i].file;
            const videoTitle = data[i].title;
            const videoId = data[i].id;

            let galleryItem = `<div class="gallery-item">
                                <div id="galleryContentContainer" class="w-100 gallery-content-container">
                                    <div id="galleryContentVideoContainer" class="gallery-content-video-container-grid">
                                        <img src="${videoThumbnail}">
                                        <div class="video-card-play-icon mb-2 position-absolute" onclick="main.view.playVideo('${videoFile}', '${videoTitle}')">
                                            ▶
                                        </div>
                                    </div>
                                    <div class="container mb-2">
                                        <div class="d-flex justify-content-between mt-2">
                                            <div class="me-3 clamp-2 text-primary-color">${videoTitle}</div>
                                            <div>
                                                <a class="text-decoration-none link-text-color" href="#" data-bs-toggle="dropdown" aria-expanded="false">
                                                    <i class="ti ti-menu-2"></i>
                                                </a>
                                                <ul class="dropdown-menu">
                                                    <li>
                                                        <a class="dropdown-item" href="#" onclick="event.preventDefault(); main.view.renameVideoModal('${videoId}', '${videoTitle}')">
                                                            <i class="ti ti-pencil me-2"></i>
                                                            Edit
                                                        </a>
                                                    </li>
                                                    <li>
                                                        <a class="dropdown-item" href="#" onclick="event.preventDefault(); main.view.deleteVideoModal('${videoId}')">
                                                            <i class="ti ti-trash red me-2"></i>
                                                            Delete
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div class="d-flex justify-content-between mt-2">
                                            <div class="extra-small mt-auto mb-auto">${month} ${date}, ${year} • ${videoSize.size} ${videoSize.unit}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>`;
            galleryContentContainer.insertAdjacentHTML('beforeend', galleryItem);
        }

        this.#gridOrListView();

        if (this.#searchMode === false) {
            this.#renderPagination(Math.ceil(this.#totaVideos / this.#pageSize), this.#page);
        }
    }

    #searchVideoLooper(data) {
        const galleryContentContainer = document.getElementById("galleryDataView");

        if (this.#order === "oldest") {
            for (let i = data.length - 1; i >= 0; i--) {
                const videoSize = this.#formatSize(data[i].size);
                const dateObj = new Date(data[i].uploaded_at * 1000);
                const date = dateObj.getDate();
                const month = dateObj.getMonth() + 1;
                const year = dateObj.getFullYear();
                const videoThumbnail = this.#config.HTTP_BACKEND_URL + "/uploads/videos/thumbnails?file=" + data[i].thumbnail;
                const videoTitle = data[i].title;
                const videoId = data[i].id;
                const videoFile = this.#config.HTTP_BACKEND_URL + "/uploads/videos?file=" + data[i].file;

                let galleryItem = '<div class="gallery-item">' +
                                    '<div id="galleryContentContainer" class="w-100 gallery-content-container">' +
                                        '<div id="galleryContentVideoContainer" class="gallery-content-video-container-grid">' +
                                            '<img src="' + videoThumbnail + '">' +
                                            '<div class="video-card-play-icon mb-2 position-absolute" onclick="main.view.playVideo(\'' + videoFile + '\', \' ' + videoTitle + ' \')">' +
                                                '▶' +
                                            '</div>' +
                                        '</div>' +
                                        '<div class="container-fluid mb-2">' +
                                            '<div class="d-flex justify-content-between mt-2">' +
                                                '<div class="me-3 clamp-2 text-primary-color">' + videoTitle + '</div>' +
                                                '<div>' +
                                                    '<a class="text-decoration-none link-text-color" href="#" data-bs-toggle="dropdown" aria-expanded="false">' +
                                                        '<i class="ti ti-menu-2"></i>' +
                                                    '</a>' +
                                                    '<ul class="dropdown-menu">' +
                                                        '<li>' +
                                                            '<a class="dropdown-item" href="#" onclick="event.preventDefault(); main.view.renameVideoModal(\'' + videoId + '\', \'' + videoTitle + '\')">' +
                                                                '<i class="ti ti-pencil me-2"></i>' +
                                                                'Edit' +
                                                            '</a>' +
                                                        '</li>' +
                                                        '<li>' +
                                                            '<a class="dropdown-item" href="#" onclick="event.preventDefault(); main.view.deleteVideoModal(\'' + videoId + '\')">' +
                                                                '<i class="ti ti-trash red me-2"></i>' +
                                                                'Delete' +
                                                            '</a>' +
                                                        '</li>' +
                                                    '</ul>' +
                                                '</div>' +
                                            '</div>' +
                                            '<div class="d-flex justify-content-between mt-2">' +
                                                '<div class="extra-small mt-auto mb-auto">' + date + '/' + month + '/' + year + ' • ' + videoSize.size + ' ' + videoSize.unit + '</div>' +
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>';
                galleryContentContainer.insertAdjacentHTML('beforeend', galleryItem);
            }
        } else {
                for (let i = 0; i < data.length; i++) {
                const videoSize = this.#formatSize(data[i].size);
                const dateObj = new Date(data[i].uploaded_at * 1000);
                const date = dateObj.getDate();
                const month = dateObj.getMonth() + 1;
                const year = dateObj.getFullYear();
                const videoThumbnail = this.#config.HTTP_BACKEND_URL + "/uploads/videos/thumbnails?file=" + data[i].thumbnail;
                const videoTitle = data[i].title;
                const videoId = data[i].id;
                const videoFile = this.#config.HTTP_BACKEND_URL + "/uploads/videos?file=" + data[i].file;

                let galleryItem = '<div class="gallery-item">' +
                                    '<div id="galleryContentContainer" class="w-100 gallery-content-container">' +
                                        '<div id="galleryContentVideoContainer" class="gallery-content-video-container-grid">' +
                                            '<img src="' + videoThumbnail + '">' +
                                            '<div class="video-card-play-icon mb-2 position-absolute" onclick="main.view.playVideo(\'' + videoFile + '\', \' ' + videoTitle + ' \')">' +
                                                '▶' +
                                            '</div>' +
                                        '</div>' +
                                        '<div class="mb-2">' +
                                            '<div class="d-flex justify-content-between mt-2">' +
                                                '<div class="me-3 clamp-2 text-primary-color">' + videoTitle + '</div>' +
                                                '<div>' +
                                                    '<a class="text-decoration-none link-text-color" href="#" data-bs-toggle="dropdown" aria-expanded="false">' +
                                                        '<i class="ti ti-menu-2"></i>' +
                                                    '</a>' +
                                                    '<ul class="dropdown-menu">' +
                                                        '<li>' +
                                                            '<a class="dropdown-item" href="#" onclick="main.view.renameVideoModal(\'' + videoId + '\', \'' + videoTitle + '\')">' +
                                                                '<i class="ti ti-pencil"></i>' +
                                                                'Edit' +
                                                            '</a>' +
                                                        '</li>' +
                                                        '<li>' +
                                                            '<a class="dropdown-item" href="#" onclick="main.view.deleteVideoModal(\'' + videoId + '\')">' +
                                                                '<i class="ti ti-trash red"></i>' +
                                                                'Delete' +
                                                            '</a>' +
                                                        '</li>' +
                                                    '</ul>' +
                                                '</div>' +
                                            '</div>' +
                                            '<div class="d-flex justify-content-between mt-2">' +
                                                '<div class="extra-small mt-auto mb-auto">' + date + '/' + month + '/' + year + ' • ' + videoSize.size + ' ' + videoSize.unit + '</div>' +
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>';
                galleryContentContainer.insertAdjacentHTML('beforeend', galleryItem);
            }
        }

        this.#gridOrListView();
        this.#hidePagination();
    }

    async #loadVideos(page) {
        let ret = null;
        let galleryDataView = document.getElementById("galleryDataView");

        this.#page = page;

        this.alertClose();

        try {
            ret = await this.#viewModel.getVideos(this.#page, this.#pageSize, this.#order);
        } catch (error) {
            if (error instanceof InternalServerError) {
                this.alertDanger(error.response.error + ".", "alertContainerVideoGallery");
            } else if (error instanceof Unauthorized) {
                const redirecTo = encodeURIComponent("/gallery");

                window.location.href = "/login?redirect_to=" + redirecTo;
            } else if (error instanceof Network) {
                this.alertDanger(error.response.error + ".", "alertContainerVideoGallery");
            } else if (error instanceof Http) {
                this.alertDanger(error.response.error + ".", "alertContainerVideoGallery");
            } else {
                this.alertDanger("Unknown error.", "alertContainerVideoGallery");
            }

            return;
        }

        if (ret.response === true) {
            galleryDataView.replaceChildren();
            this.#totaVideos = ret.data.total_videos;
            this.#videoLooper(ret.data.videos);
        }
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

    #uploadVideosHandler() {
        const dropzone = document.getElementById("dropzone");
        const fileInput = document.getElementById("fileInput");
        const fileList = document.getElementById("fileList");
        const form = document.getElementById("uploadForm");

        const allowedTypes = [
            "video/mp4",
            "video/quicktime",
            "video/x-msvideo"
        ];

        const allowedExtensions = ["mp4", "mov", "avi"];

        let files = new Array();

        const self = this;

        // Click to browse
        dropzone.addEventListener("click", () => fileInput.click());

        // Drag events
        dropzone.addEventListener("dragover", e => {
            e.preventDefault();
            dropzone.classList.add("dragover");
        });

        dropzone.addEventListener("dragleave", () => {
            dropzone.classList.remove("dragover");
        });

        dropzone.addEventListener("drop", e => {
            e.preventDefault();
            dropzone.classList.remove("dragover");
            handleFiles(e.dataTransfer.files);
        });

        // Input change
        fileInput.addEventListener("change", () => {
            handleFiles(fileInput.files);
        });

        function handleFiles(selectedFiles) {
            for (const file of selectedFiles) {
                const ext = file.name.split(".").pop().toLowerCase();

                if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
                    this.alertDanger("Invalid file tyle: " + file.name + ".", "alertContainerVideoUpload");
                    continue;
                }

                files.push({
                    file,
                    progress: 0,
                    status: "pending"
                });
            }
            renderFileList();
        }

        // Render list without progress bar
        function renderFileList() {
            fileList.innerHTML = "";

            files.forEach((item, index) => {
                const li = document.createElement("li");
                li.className = "list-group-item";

                li.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <div>
                            <span class="fw-bold">${item.file.name}</span>
                            <div class="extra-small">
                                ${(item.file.size / (1024 * 1024)).toFixed(1)} MB • ${item.status}
                            </div>
                        </div>
                        <i class="ti ti-x"></i>
                    </div>
                `;

                li.querySelector("i").addEventListener("click", () => {
                    files.splice(index, 1);
                    renderFileList();
                });

                fileList.appendChild(li);
            });
        }

        // Render list with progress bar
        function renderFileListWithProgressBar() {
            fileList.innerHTML = "";

            files.forEach((item, index) => {
                const li = document.createElement("li");
                li.className = "list-group-item";

                li.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <div>
                            <strong>${item.file.name}</strong>
                            <div class="small">
                                ${(item.file.size / (1024 * 1024)).toFixed(1)} MB • ${item.status}
                            </div>
                        </div>
                        <i class="ti ti-x"></i>
                    </div>

                    <div class="progress mt-2">
                        <div class="progress-bar" role="progressbar" style="width: ${item.progress}%">
                        ${item.progress}%
                        </div>
                    </div>
                `;

                li.querySelector("i").addEventListener("click", () => {
                    files.splice(index, 1);
                    renderFileList();
                });

                fileList.appendChild(li);
            });
        }

        // Upload all files
        form.addEventListener("submit", e => {
            e.preventDefault();
            files.forEach((item, index) => uploadFile(item, index));
        });

        // Upload single file with progress
        async function uploadFile(item, index) {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();

            formData.append("video", item.file);

            xhr.upload.addEventListener("progress", e => {
                if (e.lengthComputable) {
                    item.progress = Math.round((e.loaded / e.total) * 100);
                    item.status = "uploading";
                    renderFileListWithProgressBar();
                }
            });

            xhr.addEventListener("load", () => {
                item.progress = 100;
                item.status = "done";
                renderFileListWithProgressBar();
            });

            xhr.addEventListener("error", () => {
                item.status = "error";
                renderFileListWithProgressBar();
            });

            let ret = null;

            try {
                ret = await self.#viewModel.uploadVideo(xhr, formData);
            } catch (error) {
                if (error instanceof Unauthorized) {
                    const redirecTo = encodeURIComponent("/gallery");

                    window.location.href = "/login?redirect_to=" + redirecTo;
                } else if (error instanceof InternalServerError) {
                    self.alertDanger(error.response.error + ".", "alertContainerVideoUpload");
                } else if (error instanceof Http) {
                    self.alertDanger(error.response.error + ".", "alertContainerVideoUpload");
                } else if (error instanceof Network) {
                    self.alertDanger("Failed to connect to backend.", "alertContainerVideoUpload");
                } else {
                    self.alertDanger(error.response.error + ".", "alertContainerVideoUpload");
                }

                return;
            }

            if (ret.response === true) {
                // close modal
                // reload video gallery
                const uploadVideoModal = document.getElementById("uploadVideoModal");
                const modal = bootstrap.Modal.getInstance(uploadVideoModal);

                modal.hide();

                fileList.replaceChildren();
                files.splice(0, files.length);

                self.#refreshGalleryContent();
            }
        }
    }

    #gridOrListView() {
        const button = document.getElementById("gridOrListButton");
        const galleryDataView = document.getElementById("galleryDataView");

        if (button.value === "grid") {
            button.replaceChildren();
            button.insertAdjacentHTML("beforeend", '<i class="ti ti-list"></i>');
            button.value = "grid";

            galleryDataView.classList.add("gallery-view-grid");
            galleryDataView.classList.remove("gallery-view-list");

            document
                .querySelectorAll(".gallery-content-container")
                .forEach(div => {
                    div.classList.remove("d-flex");
                });

            document
                .querySelectorAll(".gallery-content-video-container-list")
                .forEach(div => {
                    div.classList.add("gallery-content-video-container-grid");
                });
            document
                .querySelectorAll(".gallery-content-video-container-grid")
                .forEach(div => {
                    div.classList.remove("gallery-content-video-container-list");
                });
        } else {
            button.replaceChildren();
            button.insertAdjacentHTML("beforeend", '<i class="ti ti-layout-grid"></i>');
            button.value = "list";

            galleryDataView.classList.add("gallery-view-list");
            galleryDataView.classList.remove("gallery-view-grid");

            document
                .querySelectorAll(".gallery-content-container")
                .forEach(div => {
                    div.classList.add("d-flex");
                });

            document
                .querySelectorAll(".gallery-content-video-container-grid")
                .forEach(div => {
                    div.classList.add("gallery-content-video-container-list");
                });
            document
                .querySelectorAll(".gallery-content-video-container-list")
                .forEach(div => {
                    div.classList.remove("gallery-content-video-container-grid");
                });
        }
    }

    #gridOrListViewButtonListener() {
        const button = document.getElementById("gridOrListButton");

        button.addEventListener("click", () => {
            if (button.value === "grid") {
                button.value = "list";
            } else {
                button.value = "grid";
            }

            this.#gridOrListView();
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