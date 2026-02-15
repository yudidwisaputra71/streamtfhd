# StreamTFHD
A simple YouTube streaming platform.

StreamTFHD is a simple YouTube streaming platform. It's a web app built in HTML, CSS, JavaScript, Bootstrap in the frontend; and Rust with Actix framework in the backend. 

# Dependencies
* `build-essential`
* `pkg-config`
* `libssl-dev`
* `postgresql` (16.11 or higher)
* `rustc` (1.92.0 or higher)
* `cargo` (1.92.0 or higher)
* `bash`
* `curl`
* `nginx` (for reverse proxy in production)
* `ffmpeg`
* `certbot` (if you're using SSL/TLS)
* `python3-certbot-nginx` (if you're using SSL/TLS)

*Notes: All of dependency packages listed here are Debian based packages. If you're using non Debian based Linux distribution, you can find the equivalent packages for your Linux distribution.*

# Run In Development Environment
To run this project in development environment, at first, you have to build the project. Use `cargo` to build it. This project requires `rustc` v1.92.0 (or higher) and `cargo` v1.92.0 (or higher).

## 1. Install dependency packages
To build and run this app, we need bunch of dependency packages that this app depend on it. The dependency packages is needed for building the app and for runtime. This app can be built and deployed to any Linux distribution as long as it uses `systemd` as init, but in this `README.md` we will use `Ubuntu 24.04` as an example. If you use another Linux distribution, you can find equvalent packages and command for your Linux distribution.

At first we need to do update, use this command :
```bash
sudo apt update
```

And then install dependency packages (exclude `rustc` and `cargo`) using this command :
```bash
sudo apt install build-essential pkg-config libssl-dev postgresql curl nginx ffmpeg certbot python3-certbot-nginx -y
```

For `rustc` and `cargo`, we will install the latest version using `rustup` instead of from package manager. Use this command to install `rustc` and `cargo` :
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

After that, use this command to configure your current bash shell session to use the Rust programming environment :
```bash
source "$HOME/.cargo/env"
```

Or you can just restart your current shell session.

## 2. Clone this repository
```bash
git clone https://github.com/yudidwisaputra71/streamtfhd.git
```

## 3. Change working directory to streamtfhd directory
```bash
cd streamtfhd
```

## 4. Build the project
To build the frontend, run these commands :
```bash
cd streamtfhd-frontend
cargo build
cd ../
```

To build the backend, run these commands :
```bash
cd streamtfhd-backend
cargo build
cd ../
```

## 5. Create database and database user
StreamTFHD uses `postgresql` as database. Once you create a database and a user for it, it can create needed tables by itself. Make sure the user can create tables, read, and write to the database.

### 1. Create user + database
Login as postgres :
```bash
sudo -u postgres psql
```

Then :
```sql
CREATE USER your-user WITH PASSWORD 'your-password';
CREATE DATABASE streamtfhd OWNER your-user;
```
*Change `your-user` with the user you want to create and `your-password` with the password you want to use.*

### 2. Connect to the database
Still inside psql:
```sql
\c streamtfhd
```

### 3. Give schema permissions
```sql
GRANT USAGE, CREATE ON SCHEMA public TO your-user;
```
*Change `your-user` with the user that was you create.*

### 4. Make your user own the schema
Sometimes public schema is still owned by postgres, and this causes permission issues.

Run:
```sql
ALTER SCHEMA public OWNER TO your-user;
```
*Change `your-user` with the user that was you create.*

Exit psql :
```sql
\q
```

## 6. Configure the env file for frontend
```bash
cd streamtfhd-frontend
cp env.dev .env
cd ../
```

## 7. Configure the env file for backend
```bash
cd streamtfhd-backend
cp env.dev .env
```

Edit the `.env` file with your favourite editor. Change the needed value like DATABASE_USER, DATABASE_PASSWORD, DATABASE_HOST, and DATABASE_NAME with the valid value and leave the others with default value.

## 8. Configure the frontend
The frontend is HTML, CSS, and JavaScript. In the development environment, change the BACKEND_HOST and BACKEND_PORT in `config.js` file.

Edit `streamtfhd-frontend/src/html/js/config.js` file with your favorite editor.

Fill the BACKEND_HOST property with `localhost`, and fill the BACKEND_PORT property with `8000` value, so it will looks like this:
```javascript
const base_config = {
    HTTP_PROTOCOL       : "http://",        // HTTP protocol.
    WEBSOCKET_PROTOCOL  : "ws://",          // Websocket protocol.
    BACKEND_HOST        : "localhost",      // Backend host.
    BACKEND_PORT        : 8000,             // Backend port.
    BACKEND_PATH        : null,             // Backend path. Fill it with null if you don't use backend path.
};
```

## 9. Run StreamTFHD
To run StreamTFHD, you can use cargo.

To run the frontend :
```bash
cd streamtfhd-frontend
cargo run
```

To run the backend, open another terminal and then run these commands :
```bash
cd streamtfhd-backend
cargo run
```

## 10. Open it from the browser
You can open it from the browser through `http://localhost:8080`

## 11. The backend logs
You can read the backend logs through `streamtfhd-backend/app.log` file; or from the settings, logs, in the web app.

# Quick Setup And Installation
To setup and install this app automatically into production server, run this command:
```bash
curl -s -o quick-setup-and-installation.sh https://raw.githubusercontent.com/yudidwisaputra71/streamtfhd/refs/heads/main/quick-setup-and-installation.sh && chmod +x quick-setup-and-installation.sh && sudo ./quick-setup-and-installation.sh
```

*Notes: The automatic setup and installation script does not support SSL/TLS right now. If you want to use SSL/TLS, use manual setup and installation instead, or setup it manually alongside automatic setup and installation.*

*Notes: If you use automatic setup and installation, the database user and the database is "streamtfhd".*

# Manual Installation
This is the step by step of manual configuration and installation.

## Install dependency packages
To build and run this app, we need bunch of dependency packages that this app depend on it. The dependency packages is needed for building the app and in runtime. This app can be built and deployed to any Linux distribution as long as it uses `systemd` as init, but in this `README.md` we will use `Ubuntu 24.04` as an example. If you use another Linux distribution, you can find equvalent packages and command for your Linux distribution.

At first we need to do update, use this command :
```bash
sudo apt update
```

And then install dependency packages (exclude `rustc` and `cargo`) using this command :
```bash
sudo apt install build-essential pkg-config libssl-dev postgresql curl nginx ffmpeg certbot python3-certbot-nginx -y
```

For `rustc` and `cargo`, we will install the latest version using `rustup` instead of from package manager. Use this command to install `rustc` and `cargo` :
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

After that, use this command to configure your current bash shell session to use the Rust programming environment :
```bash
source "$HOME/.cargo/env"
```

Or you can just restart your current shell session.

## Deploy it to production
This project can be deployed to any Linux distributions as long it uses `systemd` as init. The app will run under `systemd` as a service (daemon) and by `streamtfhd` user. It will write the logs to `/var/log/streamtfhd/app.log` instead of `systemd journal`. Only fatal errors of the app (like startup errors about database, env, logs, etc.) logged to `systemd journal`. If you want to debug the app, make sure you read those logs too.

### Create database and database user
StreamTFHD uses `postgresql` as database. Once you create a database and a user for it, it can create needed tables by itself. Make sure the user can create tables, read, and write to the database.

#### 1. Create user + database
Login as postgres :
```bash
sudo -u postgres psql
```

Then :
```sql
CREATE USER your-user WITH PASSWORD 'your-password';
CREATE DATABASE streamtfhd OWNER your-user;
```
*Change `your-user` with the user you want to create and `your-password` with the password you want to use.*

#### 2. Connect to the database
Still inside psql:
```sql
\c streamtfhd
```

#### 3. Give schema permissions
```sql
GRANT USAGE, CREATE ON SCHEMA public TO your-user;
```
*Change `your-user` with the user that was you create.*

#### 4. Make your user own the schema
Sometimes public schema is still owned by postgres, and this causes permission issues.

Run:
```sql
ALTER SCHEMA public OWNER TO your-user;
```
*Change `your-user` with the user that was you create.*

Exit psql :
```sql
\q
```

### Clone this repository
```bash
git clone https://github.com/yudidwisaputra71/streamtfhd.git
```

### Change working directory to streamtfhd directory
```bash
cd streamtfhd
```

### Build the project
To build for production, we will use `cargo build --release` command. It will optimize the output binary for production, it will take longer to build, but it will much faster in runtime than the debug build.

To build the frontend, run these commands:
```bash
cd streamtfhd-frontend
cargo build --release
cd ../
```

To build the backend, run these commands:
```bash
cd streamtfhd-backend
cargo build --release
cd ../
```

### Install it to the system
The installer is a `bash` script. Make sure you run it with `sudo` or equivalent. It will install all the app files to the system, make sure you are not get any error(s) in the installation process. The error message(s) will be appear in the terminal if you get any of it. To install it to the system, run this command:
```bash
sudo ./install.sh
```

### Configure the env file for frontend
Edit `/etc/streamtfhd/streamtfhd-frontend.env` file with your favorite editor. Make changes according to your setup.

### Configure the env file for backend
Edit `/etc/streamtfhd/streamtfhd-backend.env` file with your favourite editor. Change the needed value like DATABASE_USER, DATABASE_PASSWORD, DATABASE_HOST, DATABASE_NAME, JWT_SECRET_KEY, FRONTEND_HOST and FRONTEND_PORT with the valid value and leave the others with default value. As a reminder, JWT_SECRET_KEY is vital. StreamTFHD uses HS256 algorithm for JWT, which means the JWT_SECRET_KEY must be 32 (or more) bytes lenght.

### Configure the frontend
The frontend is HTML, CSS, and JavaScript. The frontend need to know what the port of the backend, what the host of the backend, what HTTP protocol should use (like unencrypted HTTP or secure and encrypted HTTPS), what WebSocket protocol should use (like unencrypted WebSocket or secure and encrypted WebSocket).

Edit the `/var/www/streamtfhd/html/js/config.js` file with your favorite editor.

In production, the frontend configuration should looks like this if you are not using SSL/TLS:
```javascript
const base_config = {
    HTTP_PROTOCOL       : "http://",            // HTTP protocol.
    WEBSOCKET_PROTOCOL  : "ws://",              // Websocket protocol.
    BACKEND_HOST        : "your-server-host",   // Backend host.
    BACKEND_PORT        : 80,                   // Backend port.
    BACKEND_PATH        : "/api/v1",            // Backend path. Fill it with null if you don't use backend path.
};
```
*Notes : Change your BACKEDN_HOST value with your real backend host.*

Or looks like this if you are using SSL/TLS:
```javascript
const base_config = {
    HTTP_PROTOCOL       : "https://",           // HTTP protocol.
    WEBSOCKET_PROTOCOL  : "wss://",             // Websocket protocol.
    BACKEND_HOST        : "your-server-host",   // Backend host.
    BACKEND_PORT        : 80,                   // Backend port.
    BACKEND_PATH        : "/api/v1",            // Backend path. Fill it with null if you don't use backend path.
};
```
*Notes : Change your BACKEDN_HOST value with your real backend host.*

### Configure NGINX as a reverse proxy
NGINX play a big role here. It's like a gate for this app to the internet. Basically, the app just run locally in the server and then NGINX comes to make the app available for the user(s) through internet. Make sure you are not miss any details to configure it or you will not able to make this app online.

Add NGINX configuration file:
```bash
sudo touch /etc/nginx/sites-available/streamtfhd
```
And then edit it with your favorite editor.

If you are not using SSL/TLS, your NGINX configuration for StreamTFHD will looks like this :
```nginx
server {
    listen 80;
    
    # Replace this with your real host
    server_name your-host;

    # Upload limit
    client_max_body_size 15G;

    # -------------------------
    # Frontend (port 8080)
    # -------------------------
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }


    # -------------------------
    # Backend API (everything else under /api/v1/)
    # -------------------------
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # -------------------------
    # WebSocket: /api/v1/live-stream/monitor
    # -------------------------
    location /api/v1/live-stream/monitor {
        proxy_pass http://127.0.0.1:8000/live-stream/monitor;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # -------------------------
    # WebSocket: /api/v1/websocket-dashboard-metrics
    # -------------------------
    location /api/v1/websocket-dashboard-metrics {
        proxy_pass http://127.0.0.1:8000/websocket-dashboard-metrics;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
*Replace `your-host` with your real host in production.*

Or, if you're using SSL/TLS, your NGINX configuration file will looks like this:
```nginx
server {
    listen 80;

    # Replace this with your real host
    server_name your-host;

    # Auto redirect to https://
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;

    # Replace this with your real host
    server_name your-host;

    # Your SSL cert files
    # Replace it with your real SSL certificate files
    ssl_certificate     /path/to/your/ssl/certificate;
    ssl_certificate_key /path/to/your/ssl/certificate/key;

    # Optional but recommended
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Upload limit
    client_max_body_size 15G;

    # -------------------------
    # Frontend (port 8080)
    # -------------------------
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }


    # -------------------------
    # Backend API (everything else under /api/v1/)
    # -------------------------
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # -------------------------
    # WebSocket: /api/v1/live-stream/monitor
    # -------------------------
    location /api/v1/live-stream/monitor {
        proxy_pass http://127.0.0.1:8000/live-stream/monitor;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # -------------------------
    # WebSocket: /api/v1/websocket-dashboard-metrics
    # -------------------------
    location /api/v1/websocket-dashboard-metrics {
        proxy_pass http://127.0.0.1:8000/websocket-dashboard-metrics;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
*Make sure you change the `ssl_certificate`, `ssl_certificate_key`, and `server_name` value with real value.*

To enable the site, you can create a symbolic link in `/etc/nginx/sites-enabled/` by using this command:
```bash
sudo ln -s /etc/nginx/sites-available/streamtfhd /etc/nginx/sites-enabled/streamtfhd
```

Remove the default configuration of NGINX web server:
```bash
sudo rm /etc/nginx/sites-available/default
```

Check if you have any error(s) in your NGINX configuration using this command:
```bash
sudo nginx -t
```

And then restart the NGINX service using `systemctl` command :
```bash
sudo systemctl restart nginx
```

### Start StreamTFHD service
To start both StreamTFHD service backend and frontend, you can use `systemctl` command. Make sure `postgresql` service already running, if not, the StreamTFHD backend service will not start.

#### Start StreamTFHD frontend

To start the frontend, use this command:
```bash
sudo systemctl start streamtfhd-frontend.service
```

Check if you get any error(s) using `journalctl` command:
```bash
journalctl -u streamtfhd-frontend.service -f
```

Check is your frontend service is running or not:
```bash
sudo systemctl status streamtfhd-frontend.service
```

#### Start StreamTFHD backend

To start the backend, use this command:
```bash
sudo systemctl start streamtfhd-backend.service
```

Check if you get any error(s) using `journalctl` command:
```bash
journalctl -u streamtfhd-backend.service -f
```

Check is your backend service is running or not:
```bash
sudo systemctl status streamtfhd-backend.service
```

And now you can access the app through browser in `http://your-host`

### Make the app service survive restart/reboot
To make the app survive from restart or reboot, you must make the app start automatically at boot. To do that, you can use `systemd` through `systemctl` command.

To make the frontend start automatically at boot, use this command:
```bash
sudo systemctl enable streamtfhd-frontend.service
```

To make the backend start automatically at boot, use this command:
```bash
sudo systemctl enable streamtfhd-backend.service
```

# Set The Server's Timezone
```bash
sudo timedatectl set-timezone Asia/Jakarta
```

# Reset Password
Sometimes we forgot the password that we use because of some reason. The web app does not have dedicated reset password feature so if we forgot the password we will locked out from the app. That's why `streamtfhd-reset-password` exist. Basically, `streamtfhd-reset-password` is a Rust project that we can build and run using `cargo`.

To reset the password, at first, we have to build the `streamtfhd-reset-password` using cargo :
```bash
cd streamtfhd-reset-password
cargo build
```

Copy the `env.file` file to `.env`
```bash
cp env.file .env
```

Edit the `.env` file using your favorite editor. Fill all nedded informations like DATABASE_USER, DATABASE_PASSWORD, DATABASE_HOST, and DATABASE_NAME.

After that, now you can reset the password by runing it using `cargo`
```bash
cargo run
```

And then follow the instructions.