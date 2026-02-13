'use strict';

import { DarkMode } from './Utils/DarkMode.js';
import config from './config.js';

class Main {
    importedView = null;
    view = null;
    
    constructor() {
        DarkMode.setLightOrDarkMode();
        DarkMode.darkModeButtonListener();
        this.fire();
    }

    path() {
        let pathSegments = window.location.pathname.split("/").filter(segment => segment);
        return pathSegments;
    }

    fire() {
        switch(this.path()[0]) {
            case undefined :
                this.importedView = import('./View/IndexView.js');
                this.importedView.then(
                    result => {
                        this.view = new result.IndexView(config);
                    },
                    error => {
                        console.log(error);
                    }
                );
                break;
            case "gallery" :
                this.importedView = import('./View/GalleryView.js');
                this.importedView.then(
                    result => {
                        this.view = new result.GalleryView(config);
                    },
                    error => {
                        console.log(error);
                    }
                );
                break;
            case "history" :
                this.importedView = import('./View/HistoryView.js');
                this.importedView.then(
                    result => {
                        this.view = new result.HistoryView(config);
                    },
                    error => {
                        console.log(error);
                    }
                );
                break;
            case "settings" :
                this.importedView = import('./View/SettingsView.js');
                this.importedView.then(
                    result => {
                        this.view = new result.SettingsView(config);
                    },
                    error => {
                        console.log(error);
                    }
                );
                break;
            case "setup-account" :
                this.importedView = import('./View/SetupAccountView.js');
                this.importedView.then(
                    result => {
                        this.view = new result.SetupAccountView(config);
                    },
                    error => {
                        console.log(error);
                    }
                );
                break;
            case "login" :
                this.importedView = import('./View/LoginView.js');
                this.importedView.then(
                    result => {
                        this.view = new result.LoginView(config);
                    },
                    error => {
                        console.log(error);
                    }
                );
                break;
            case "logout" :
                this.importedView = import('./View/LogoutView.js');
                this.importedView.then(
                    result => {
                        this.view = new result.LogoutView();
                    },
                    error => {
                        console.log(error);
                    }
                );
                break;
        }
    }
}

window.main = new Main();