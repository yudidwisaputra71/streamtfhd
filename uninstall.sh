#!/bin/bash

function if_not_run_by_superuser() {
    if [ "$EUID" -ne 0 ]; then
        echo "You must run this installation script with superuser privilege.";

        exit 1;
    fi
}

function stop_streamtfhd_services() {
    if systemctl is-active --quiet streamtfhd-backend.service; then
        if ! systemctl stop streamtfhd-backend.service; then
            echo "Failed to stop streamtfd-frontend service";

            exit 2;
        fi
    fi

    if systemctl is-active --quiet streamtfhd-frontend.service; then
        if ! systemctl stop streamtfhd-frontend.service; then
            echo "Failed to stop streamtfd-frontend service";

            exit 3;
        fi
    fi
}

function delete_systemd_unit_file_for_frontend() {
    if [ -f /etc/systemd/system/streamtfhd-frontend.service ]; then
        if ! rm -v /etc/systemd/system/streamtfhd-frontend.service; then
            echo "Failed to remove systemd unit file for frontend.";

            exit 5;
        fi
    fi
}

function delete_systemd_unit_file_for_backend() {
    if [ -f /etc/systemd/system/streamtfhd-backend.service ]; then
        if ! rm -v /etc/systemd/system/streamtfhd-backend.service; then
            echo "Failed to remove systemd unit file for frontend.";

            exit 5;
        fi
    fi
}

function reload_systemd() {
    systemctl daemon-reload;
}

function delete_streamtfhd_user() {
    if grep -q "^streamtfhd:" /etc/passwd ; then
        if ! userdel -f streamtfhd; then
            echo "Failed to delete streamtfhd user.";

            exit 332;
        fi
    fi
}

function uninstall_binary_files() {
    if [ -f /usr/local/bin/streamtfhd-backend ]; then
        if ! rm -v /usr/local/bin/streamtfhd-backend; then
            echo "Failed to uninstall septblog-backend binary file.";

            exit 432;
        fi
    fi

    if [ -f /usr/local/bin/streamtfhd-frontend ]; then
        if ! rm -v /usr/local/bin/streamtfhd-frontend ; then
            echo "Failed to uninstall septblog-frontend binary file.";

            exit 900;
        fi
    fi
}

function delete_all_frontend_html_files() {
    if [ -d /var/www/streamtfhd ]; then
        if ! rm -Rv /var/www/streamtfhd; then
            echo "Failed to delete frontend HTML files.";

            exit 193;
        fi
    fi
}

function remove_log_dir() {
    if [ -d /var/log/streamtfhd ]; then
        if ! rm -Rv /var/log/streamtfhd; then
            echo "Failed to remove log dir (/var/log/streamtfhd)";

            exit 291;
        fi
    fi
}

function fire() {
    if_not_run_by_superuser;

    stop_streamtfhd_services;

    delete_systemd_unit_file_for_frontend;
    delete_systemd_unit_file_for_backend;

    reload_systemd;

    delete_streamtfhd_user;

    uninstall_binary_files;

    delete_all_frontend_html_files;

    remove_log_dir
}

fire;