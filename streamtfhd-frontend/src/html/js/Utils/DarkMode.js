'use strict';

export class DarkMode {
    static darkModeButtonListener() {
        const toggleBtn = document.getElementById("themeToggle");
        const root = document.documentElement;

        toggleBtn.addEventListener("click", () => {
            const current = root.getAttribute("data-theme");
            let theme = "";

            if (current === "dark") {
                toggleBtn.classList.add("ti-moon");
                toggleBtn.classList.remove("ti-sun");
                theme = "light";
            } else {
                toggleBtn.classList.add("ti-sun");
                toggleBtn.classList.remove("ti-moon");
                theme = "dark";
            }

            root.setAttribute("data-theme", theme);
            localStorage.setItem("theme", theme);
        });
    }

    static setLightOrDarkMode() {
        const toggleBtn = document.getElementById("themeToggle");
        const savedTheme = localStorage.getItem("theme");
        const root = document.documentElement;
        
        if (savedTheme) {
            root.setAttribute("data-theme", savedTheme);

            if (savedTheme === "dark") {
                toggleBtn.classList.add("ti-sun");
                toggleBtn.classList.remove("ti-moon");
            } else {
                toggleBtn.classList.add("ti-moon");
                toggleBtn.classList.remove("ti-sun");
            }
        } else {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

            root.setAttribute("data-theme", prefersDark ? "dark" : "light");
        }
    }
}