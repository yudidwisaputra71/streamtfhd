use sysinfo::{System, Networks, Disks};
use tokio::sync::broadcast;
use std::time::Duration;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct Metrics {
    cpu: f32,               // In percent
    used_memory: u64,       // In Kilobytes
    total_memory: u64,      // In Kilobytes
    bandwidth: u64,         // In Kilobytes
    disk_used: u64,         // In Kilobytes
    disk_available: u64,    // In Kilobytes
    download_kbps: u64,     // In Kilobytes
    upload_kbps: u64,       // In Kilobytes
}

pub async fn metrics_collector(tx: broadcast::Sender<Metrics>) {
    let mut sys = System::new_all();

    loop {
        sys.refresh_all();

        let cpu = sys.global_cpu_usage();
        let used_memory = sys.used_memory() / 1024;
        let total_memory = sys.total_memory() / 1024;
        let mut networks = Networks::new_with_refreshed_list();
        let mut total_rx: u64 = 0;
        let mut total_tx: u64 = 0;
        let disks = Disks::new_with_refreshed_list();
        let mut disk_total_space: u64 = 0;
        let mut disk_available_space: u64 = 0;
        let disk_used: u64;

        for (_iface, data) in networks.iter() {
            total_rx += data.total_received();
            total_tx += data.total_transmitted();
        }

        for disk in disks.iter() {
            disk_total_space += disk.total_space();
            disk_available_space += disk.available_space();
        }

        disk_used = disk_total_space - disk_available_space;

        let last_rx = total_rx.clone();
        let last_tx = total_tx.clone();

        total_rx = 0;
        total_tx = 0;

        tokio::time::sleep(Duration::from_secs(1)).await;

        networks.refresh(false);

        for (_iface, data) in networks.iter() {
            total_rx += data.total_received();
            total_tx += data.total_transmitted();
        }

        /*
        let download_bps = total_rx - last_rx;
        let upload_bps = total_tx - last_tx;
        */

        let download_bps = total_rx.saturating_sub(last_rx);
        let upload_bps = total_tx.saturating_sub(last_tx);

        let metrics = Metrics {
            cpu,
            used_memory,
            total_memory,
            bandwidth: (total_rx + total_tx) / 1024,
            disk_used: disk_used / 1024,
            //disk_available: disk_available_space / 1024,
            disk_available: disk_total_space / 1024,
            download_kbps: download_bps / 1024,
            upload_kbps: upload_bps / 1024,
        };

        let _ = tx.send(metrics);

        tokio::time::sleep(Duration::from_secs(4)).await;
    }
}