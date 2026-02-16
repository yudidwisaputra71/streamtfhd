#!/bin/bash

set -euo pipefail

# Uncomment it to debug this script
#set -x

source /etc/os-release

HOST=""
PORT= 
DATABASE_NAME="streamtfhd"
DATABASE_USER="streamtfhd"
DATABASE_PASSWORD="streamtfhd"
DEPENDENCIES_UBUNTU=("build-essential" "pkg-config" "libssl-dev" "nginx" "ffmpeg" "certbot" "python3-certbot-nginx" "git" "postgresql" "curl" "sed")
DEPENDENCIES_DEBIAN=("build-essential" "pkg-config" "libssl-dev" "nginx" "ffmpeg" "certbot" "python3-certbot-nginx" "git" "postgresql" "curl" "sed")
SUPPORTED_DISTRIBUTIONS=("debian" "ubuntu")

function if_not_run_by_superuser() {
    if [ "$EUID" -ne 0 ]; then
        echo "You must run this installation script with superuser privilege.";

        exit 1;
    fi
}

function get_server_host() {
    while true; do
        read -p "Enter the host that will you use for this app : " HOST

        if [ ! -z $HOST ]; then
            break
        fi
    done
}

function get_server_port() {
    while true; do
        read -p "Enter the port that will you use for this app : " PORT

        if [ ! -z $PORT ]; then
            break
        fi
    done
}

function is_the_distribution_in_the_supported_list() {
    for item in "${SUPPORTED_DISTRIBUTIONS[@]}"; do
        if [ "$ID" == "$item" ]; then
            echo "yes"
            return
        fi
    done

    echo "no";
}

function if_the_distribution_is_not_in_the_supported_list() {
    is_supported=$(is_the_distribution_in_the_supported_list)

    if [ $is_supported == "no" ]; then
        echo "You are using ${ID}, your distribution is not support to run this script. Please use manual setup and installation instead."
        exit 32
    fi
}

function get_not_installed_packages_from_dependencies() {
    packages=""
    dependencies=

    case "$ID" in
        debian)
            for item in "${DEPENDENCIES_DEBIAN[@]}"; do
                if ! dpkg --list $item > /dev/null; then
                    packages="${packages} ${item}"
                fi
            done
            ;;
        ubuntu)
            for item in "${DEPENDENCIES_UBUNTU[@]}"; do
                if ! dpkg --list $item > /dev/null; then
                    packages="${packages} ${item}"
                fi
            done
            ;;
        *)
            packages="null"
            ;;
    esac

    echo $packages;
}

function install_dependencies_debian() {
    packages="$(get_not_installed_packages_from_dependencies)"

    if [ -z "$packages" ]; then
        echo "No need to install Debian dependencies"
    else
        apt update
        apt install $packages -y
    fi
}

function install_dependencies_ubuntu() {
    packages="$(get_not_installed_packages_from_dependencies)"

    if [ -z "$packages" ]; then
        echo "No need to install Ubuntu dependencies"
    else
        apt update
        apt install $packages -y
    fi
}

function install_dependencies() {
    case "$ID" in
        debian)
            install_dependencies_debian
            ;;
        ubuntu)
            install_dependencies_ubuntu
            ;;
        *)
            echo "Do nothing."
            ;;
    esac
}

function install_rust_if_not_installed() {
    if ! which rustc > /dev/null; then
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
    else
        version=$(rustc --version | awk '{print $2}')
        minimum_version="1.92.0"

        if [ "$version" == "$minimum_version" ]; then
            return
        fi

        if [ "$(printf "%s\n%s\n" "$version" "$minimum_version" | sort -V | head -n1)" = "$version" ]; then
            curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
            source "$HOME/.cargo/env"
        fi
    fi
}

function create_database_and_user_and_grant_privileges_to_the_user() {
    echo "== PostgreSQL setup: db=$DATABASE_NAME user=$DATABASE_USER =="

    # 1) Create user if not exists (allowed)
    sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$DATABASE_USER') THEN
        CREATE ROLE $DATABASE_USER LOGIN PASSWORD '$DATABASE_PASSWORD';
        RAISE NOTICE 'User $DATABASE_USER created.';
    ELSE
        RAISE NOTICE 'User $DATABASE_USER already exists.';
        ALTER ROLE $DATABASE_USER WITH PASSWORD '$DATABASE_PASSWORD';
        RAISE NOTICE 'User $DATABASE_USER password ensured.';
    END IF;
END
\$\$;
EOF

    # 2) Create database if not exists (MUST NOT be inside DO block)
    DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DATABASE_NAME'")

    if [ "$DB_EXISTS" != "1" ]; then
        sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DATABASE_NAME;"
        echo "Database $DATABASE_NAME created."
    else
        echo "Database $DATABASE_NAME already exists."
    fi

    # 3) Ensure ownership + connect
    sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
ALTER DATABASE $DATABASE_NAME OWNER TO $DATABASE_USER;
GRANT CONNECT ON DATABASE $DATABASE_NAME TO $DATABASE_USER;
EOF

    # 4) Schema + table privileges (inside the DB)
    sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" <<EOF
GRANT USAGE, CREATE ON SCHEMA public TO $DATABASE_USER;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $DATABASE_USER;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO $DATABASE_USER;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $DATABASE_USER;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO $DATABASE_USER;
EOF

    echo "== Done. User + database are ready. =="
}

function clone_streamtfhd_repository() {
    if [ -d ./streamtfhd ]; then
        rm -Rvf ./streamtfhd
    fi

    git clone https://github.com/yudidwisaputra71/streamtfhd.git
}

function change_working_directory_to_streamtfhd() {
    cd streamtfhd
}

function build_the_frontend() {
    cd streamtfhd-frontend

    cargo build --release --verbose

    cd ../
}

function build_the_backend() {
    cd streamtfhd-backend

    cargo build --release --verbose

    cd ../
}

function create_streamtfhd_user() {
    if id -u streamtfhd >/dev/null 2>&1; then
        echo "User streamtfhd already exists. Skipping creation."
        return 0
    fi

    adduser --system --no-create-home --group streamtfhd
}

function create_var_www_dir_if_not_exist() {
    if [ ! -d /var/www ]; then
        mkdir -v /var/www;

        chown root:root /var/www
    fi
}

function create_var_www_streamfhd_for_frontend() {
    if [ ! -d /var/www/streamtfhd ]; then
        mkdir -v /var/www/streamtfhd

        chown streamtfhd:streamtfhd /var/www/streamtfhd
    fi
}

function cp_frontend_contents_to_var_www_streamtfhd_dir() {
    cp -rv streamtfhd-frontend/src/html /var/www/streamtfhd/

    chown -Rv streamtfhd:streamtfhd /var/www/streamtfhd
}

function create_etc_streamtfhd_directory() {
    if [ ! -d /etc/streamtfhd ]; then
        mkdir -v /etc/streamtfhd

        chmod -v 600 /etc/streamtfhd

        chown -v root:root /etc/streamtfhd
    fi
}

function cp_prod_env_file_backend_to_etc_streamtfhd() {
    cp -v streamtfhd-backend/env.prod /etc/streamtfhd/streamtfhd-backend.env

    chown -v streamtfhd:streamtfhd /etc/streamtfhd/streamtfhd-backend.env

    chmod -v 640 /etc/streamtfhd/streamtfhd-backend.env
}

function cp_prod_env_file_frontend_to_etc_streamtfhd() {
    cp -v streamtfhd-frontend/env.prod /etc/streamtfhd/streamtfhd-frontend.env

    chown -v streamtfhd:streamtfhd /etc/streamtfhd/streamtfhd-frontend.env

    chmod -v 640 /etc/streamtfhd/streamtfhd-frontend.env
}

function cp_backend_bin_to_usr_local_bin() {
    if [ -f streamtfhd-backend/target/release/streamtfhd-backend ]; then
        cp -v streamtfhd-backend/target/release/streamtfhd-backend /usr/local/bin/streamtfhd-backend
    else
        echo "streamtfhd-backend/target/release/streamtfhd-backend is not found. Make sure you build the streamtfhd-backend and make sure you build it with --release option.";

        exit 899;
    fi
}

function cp_frontend_bin_to_usr_local_bin() {
    if [ -f streamtfhd-frontend/target/release/streamtfhd-frontend ]; then
        cp -v streamtfhd-frontend/target/release/streamtfhd-frontend /usr/local/bin/streamtfhd-frontend
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
        mkdir -v /var/log/streamtfhd
    fi
    
    chown -v streamtfhd:streamtfhd /var/log/streamtfhd
}

function set_frontend_env_file() {
    return
}

function set_backend_env_file() {
    file="/etc/streamtfhd/streamtfhd-backend.env"
    secret_key="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32 || true)"

    sed -i "s/DATABASE_USER=database-user/DATABASE_USER=$DATABASE_USER/" $file
    sed -i "s/DATABASE_PASSWORD=database-password/DATABASE_PASSWORD=$DATABASE_PASSWORD/" $file
    sed -i "s/DATABASE_HOST=database-host/DATABASE_HOST=localhost/" $file
    sed -i "s/DATABASE_NAME=database-name/DATABASE_NAME=$DATABASE_NAME/" $file
    sed -i "s/FRONTEND_HOST=your-frontend-host/FRONTEND_HOST=$HOST/" $file
    sed -i "s/JWT_SECRET_KEY=very-very-secret-key/JWT_SECRET_KEY=$secret_key/" $file
    sed -i "s/FRONTEND_PORT=80/FRONTEND_PORT=$PORT/" $file
}

function set_frontend_config_js() {
    file="/var/www/streamtfhd/html/js/config.js"

    sed -i "s/BACKEND_HOST        : \"your-backend-host\",/BACKEND_HOST        : \"$HOST\",/" $file
    sed -i "s/BACKEND_PORT        : 80,/BACKEND_PORT        : $PORT,/" $file
    sed -i "s/BACKEND_PATH        : null,/BACKEND_PATH        : \"\/api\/v1\",/" $file
}

function set_nginx_config_file() {
    cat <<EOF > /etc/nginx/sites-available/streamtfhd
server {
    listen $PORT;
    
    server_name $HOST;

    # Upload limit
    client_max_body_size 15G;

    # -------------------------
    # Frontend (port 8080)
    # -------------------------
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }


    # -------------------------
    # Backend API (everything else under /api/v1/)
    # -------------------------
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # -------------------------
    # WebSocket: /api/v1/live-stream/monitor
    # -------------------------
    location /api/v1/live-stream/monitor {
        proxy_pass http://127.0.0.1:8000/live-stream/monitor;
        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # -------------------------
    # WebSocket: /api/v1/websocket-dashboard-metrics
    # -------------------------
    location /api/v1/websocket-dashboard-metrics {
        proxy_pass http://127.0.0.1:8000/websocket-dashboard-metrics;
        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

    ln -s /etc/nginx/sites-available/streamtfhd /etc/nginx/sites-enabled/streamtfhd

    if [ -f /etc/nginx/sites-enabled/default ]; then
        rm -v /etc/nginx/sites-enabled/default
    fi

    if [ -f /etc/nginx/sites-available/default ]; then
        rm -v /etc/nginx/sites-available/default
    fi
}

function restart_nginx_service() {
    systemctl restart nginx
}

function reload_systemd_daemon() {
    systemctl daemon-reload
}

function start_streamtfhd_backend_service() {
    systemctl start streamtfhd-backend.service
}

function start_streamtfhd_frontend_service() {
    systemctl start streamtfhd-frontend.service
}

function enable_streamtfhd_backend_service() {
    systemctl enable streamtfhd-backend.service
}

function enable_streamtfhd_frontend_service() {
    systemctl enable streamtfhd-frontend.service
}

function set_servers_timezone() {
    timedatectl set-timezone Asia/Jakarta
}

function change_working_directory_to_streamtfhds_parent_dir() {
    cd ../
}

function remove_cloned_repository() {
    rm -Rfv ./streamtfhd
}

function remove_installer_script() {
    rm -v ./quick-setup-and-installation.sh
}

function main() {
    if_not_run_by_superuser

    get_server_host
    get_server_port
    
    if_the_distribution_is_not_in_the_supported_list
    install_dependencies
    install_rust_if_not_installed

    clone_streamtfhd_repository
    change_working_directory_to_streamtfhd

    create_database_and_user_and_grant_privileges_to_the_user

    build_the_frontend
    build_the_backend

    create_streamtfhd_user
    create_var_www_dir_if_not_exist
    create_var_www_streamfhd_for_frontend
    cp_frontend_contents_to_var_www_streamtfhd_dir
    create_etc_streamtfhd_directory
    cp_prod_env_file_backend_to_etc_streamtfhd
    cp_prod_env_file_frontend_to_etc_streamtfhd
    cp_backend_bin_to_usr_local_bin
    cp_frontend_bin_to_usr_local_bin
    create_systemd_unit_file_for_backend
    create_systemd_unit_file_for_frontend
    create_log_dir

    set_frontend_env_file
    set_backend_env_file
    set_frontend_config_js

    set_nginx_config_file
    restart_nginx_service

    reload_systemd_daemon

    start_streamtfhd_backend_service
    start_streamtfhd_frontend_service
    enable_streamtfhd_backend_service
    enable_streamtfhd_frontend_service

    set_servers_timezone

    change_working_directory_to_streamtfhds_parent_dir

    remove_cloned_repository

    remove_installer_script
}

main