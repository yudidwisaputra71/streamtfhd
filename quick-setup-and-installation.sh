#!/bin/bash

#source /etc/os-release

set -e

ID="ubuntu"

SERVER_HOST=""
SERVER_PORT= 
DATABASE_NAME=""
DATABASE_PASSWORD=""
DEPENDENCIES_UBUNTU=("build-essential" "pkg-config" "libssl-dev" "nginx" "ffmpeg" "certbot" "python3-certbot-nginx" "git" "postgresql" "curl")
DEPENDENCIES_DEBIAN=("build-essential" "pkg-config" "libssl-dev" "nginx" "ffmpeg" "certbot" "python3-certbot-nginx" "git" "postgresql" "curl")
SUPPORTED_DISTRIBUTIONS=("debian" "ubuntu")

function get_server_host() {
    while true; do
        read -p "Enter the host that will you use for this app : " SERVER_HOST

        if [ ! -z $SERVER_HOST ]; then
            break
        fi
    done
}

function get_server_port() {
    while true; do
        read -p "Enter the port that will you use for this app : " SERVER_PORT

        if [ ! -z $SERVER_PORT ]; then
            break
        fi
    done
}

function get_database_name() {
    while true; do
        read -p "Enter a database name that you want to create for storing the app data : " DATABASE_NAME

        if [ ! -z $DATABASE_NAME ]; then
            break
        fi
    done
}

function get_database_password {
    while true; do
        read -p "Enter a password for your database : " DATABASE_PASSWORD

        if [ ! -z $DATABASE_PASSWORD ]; then
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
    packages=$(get_not_installed_packages_from_dependencies)

    if [ $packages == ""]; then
        echo "No need to install Debian dependencies"
    else
        apt install $packages -y
    fi
}

function install_dependencies_ubuntu() {
    packages=$(get_not_installed_packages_from_dependencies)

    if [ $packages == ""]; then
        echo "No need to install Ubuntu dependencies"
    else
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

        if [ $version == $minimum_version ]; then
            return
        fi

        if [ "$(printf "%s\n%s\n" "$version" "$minimum_version" | sort -V | head -n1)" = "$version" ]; then
            curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
            source "$HOME/.cargo/env"
        fi
    fi
}

function main() {
    get_server_host
    get_server_port
    get_database_name
    get_database_password
    #if_the_distribution_is_not_in_the_supported_list
    #install_dependencies
    #install_rust_if_not_installed
}

main