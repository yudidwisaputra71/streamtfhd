#!/bin/bash

function if_not_run_by_superuser() {
    if [ "$EUID" -ne 0 ]; then
        echo "You must run this installation script with superuser privilege.";

        exit 1;
    fi
}

function create_streamtfhd_user() {
    if id -u streamtfhd >/dev/null 2>&1; then
        echo "User streamtfhd already exists. Skipping creation."
        return 0
    fi

    if ! adduser --system --no-create-home --group streamtfhd; then
        echo "Failed to create streamtfhd user."

        exit 789
    fi
}

function create_var_www_dir_if_not_exit() {
    if [ ! -d /var/www ]; then
        mkdir -v /var/www;

        if [ $? -gt 0 ]; then
            echo "Failed to create /var/www directory.";

            exit 432;
        fi

        if ! chown root:root /var/www; then
            echo "Failed to change directory /var/www owner to root."

            exit 744;
        fi
    fi
}

function create_var_www_streamfhd_for_frontend() {
    if [ ! -d /var/www/streamtfhd ]; then
        mkdir -v /var/www/streamtfhd

        if [ $? -gt 0 ]; then
            echo "Failed to create /var/www/streamtfhd directory.";

            exit 431;
        fi

        if ! chown streamtfhd:streamtfhd /var/www/streamtfhd; then
            echo "Failed to change directory /var/www/streamtfhd owner to root."

            exit 745;
        fi
    fi
}

function cp_frontend_contents_to_var_www_streamtfhd_dir() {
    if ! cp -rv streamtfhd-frontend/src/html /var/www/streamtfhd/; then
        echo "Failed to copy frontend files to /var/www/streamtfhd.";

        exit 900;
    fi

    if ! chown -Rv streamtfhd:streamtfhd /var/www/streamtfhd; then
        echo "Failed to chown /var/www/streamtfhd to streamtfhd user.";

        exit 101;
    fi
}

function create_etc_streamtfhd_directory() {
    if [ ! -d /etc/streamtfhd ]; then
        if ! mkdir -v /etc/streamtfhd; then
            echo "Failed to create /etc/streamtfhd directory.";

            exit 455;
        fi

        if ! chmod -v 600 /etc/streamtfhd; then
            echo "Failed to chmod /etc/streamtfhd directory.";

            exit 921;
        fi

        if ! chown -v root:root /etc/streamtfhd; then
            echo "Failed to chwon /etc/streamtfhd directory.";

            exit 120;
        fi
    fi
}

function cp_prod_env_file_backend_to_etc_streamtfhd() {
    if ! cp -v streamtfhd-backend/env.prod /etc/streamtfhd/streamtfhd-backend.env; then
        echo "failed to copy env file to /etc/streamtfhd-backend.env";

        exit 399;
    fi

    if ! chown -v streamtfhd:streamtfhd /etc/streamtfhd/streamtfhd-backend.env; then
        echo "Failed to chwon /etc/streamtfhd/streamtfhd-backend.env file.";

        exit 322;
    fi

    if ! chmod -v 640 /etc/streamtfhd/streamtfhd-backend.env; then
        echo "Failed to chmod /etc/streamtfhd/streamtfhd-backend.env file.";

        exit 322;
    fi
}

function cp_prod_env_file_frontend_to_etc_streamtfhd() {
    if ! cp -v streamtfhd-frontend/env.prod /etc/streamtfhd/streamtfhd-frontend.env; then
        echo "failed to copy env file to /etc/streamtfhd-frontend.env";

        exit 399;
    fi

    if ! chown -v streamtfhd:streamtfhd /etc/streamtfhd/streamtfhd-frontend.env; then
        echo "Failed to chwon /etc/streamtfhd/streamtfhd-frontend.env file.";

        exit 322;
    fi

    if ! chmod -v 640 /etc/streamtfhd/streamtfhd-frontend.env; then
        echo "Failed to chmod /etc/streamtfhd/streamtfhd-frontend.env file.";

        exit 322;
    fi
}

function cp_backend_bin_to_usr_local_bin() {
    if [ -f streamtfhd-backend/target/release/streamtfhd-backend ]; then
        if ! cp -v streamtfhd-backend/target/release/streamtfhd-backend /usr/local/bin/streamtfhd-backend; then
            echo "Failed to copy streamtfhd-backend/target/release/streamtfhd-backend to /usr/local/bin.";

            exit 899;
        fi
    else
        echo "streamtfhd-backend/target/release/streamtfhd-backend is not found. Make sure you build the streamtfhd-backend and make sure you build it with --release option.";

        exit 1;
    fi
}

function cp_frontend_bin_to_usr_local_bin() {
    if [ -f streamtfhd-frontend/target/release/streamtfhd-frontend ]; then
        if ! cp -v streamtfhd-frontend/target/release/streamtfhd-frontend /usr/local/bin/streamtfhd-frontend; then
            echo "Failed to copy streamtfhd-frontend/target/release/streamtfhd-frontend to /usr/local/bin.";

            exit 899;
        fi
    else
        echo "streamtfhd-frontend/target/release/streamtfhd-frontend is not found. Make sure you build the streamtfhd-frontend and make sure you build it with --release option.";

        exit 1;
    fi
}

function create_systemd_unit_file_for_backend() {
    cat <<EOF > /etc/systemd/system/streamtfhd-backend.service
[Unit]
Description=StreamTFHD Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=streamtfhd
Group=streamtfhd

ExecStart=/usr/local/bin/streamtfhd-backend

Restart=no

StandardOutput=journal
StandardError=journal

EnvironmentFile=/etc/streamtfhd/streamtfhd-backend.env

WorkingDirectory=/var/www/streamtfhd

[Install]
WantedBy=multi-user.target
EOF
}

function create_systemd_unit_file_for_frontend() {
    cat <<EOF > /etc/systemd/system/streamtfhd-frontend.service
[Unit]
Description=StreamTFHD Frontend Service
After=network.target streamtfhd-backend.service

[Service]
Type=simple
User=streamtfhd
Group=streamtfhd

ExecStart=/usr/local/bin/streamtfhd-frontend

Restart=no

EnvironmentFile=/etc/streamtfhd/streamtfhd-frontend.env

StandardOutput=journal
StandardError=journal

WorkingDirectory=/var/www/streamtfhd

[Install]
WantedBy=multi-user.target
EOF
}

function create_log_dir() {
    if [ ! -d /var/log/streamtfhd ]; then
        if ! mkdir -v /var/log/streamtfhd; then
            echo "Failed to create log dir (/var/log/streamtfhd).";

            exit 543;
        fi
    fi
    
    if ! chown -v streamtfhd:streamtfhd /var/log/streamtfhd; then
        echo "Failed to chwon /var/log/streamtfhd";

        exit 432;
    fi
}

function fire() {
    if_not_run_by_superuser;

    create_streamtfhd_user;

    create_var_www_dir_if_not_exit;
    create_var_www_streamfhd_for_frontend;
    create_etc_streamtfhd_directory;

    cp_frontend_contents_to_var_www_streamtfhd_dir;
    cp_frontend_bin_to_usr_local_bin;
    cp_backend_bin_to_usr_local_bin;
    cp_frontend_bin_to_usr_local_bin;
    cp_prod_env_file_backend_to_etc_streamtfhd
    cp_prod_env_file_frontend_to_etc_streamtfhd;

    create_systemd_unit_file_for_backend;
    create_systemd_unit_file_for_frontend;

    create_log_dir;
}

fire;