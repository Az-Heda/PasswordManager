use std::{
    fs::{self, File},
    io::Read,
    path::Path,
};

use argon2::{password_hash::Salt, Argon2, PasswordHasher};
use base64::{self, Engine};

const SERVICE_FILENAME: &str = "services.txt";

#[tauri::command]
fn passwordify(password: &str, service: &str) -> String {
    let mut b64 =
        base64::prelude::BASE64_STANDARD.encode(String::from(service) + service + service);
    b64 = b64.replace("=", "");
    let s = Salt::from_b64(b64.as_str()).unwrap();
    let argon2 = Argon2::default();
    let hash = argon2.hash_password(password.as_bytes(), s).unwrap();
    let hash_string = hash.to_string();
    let mut parts = hash_string.split("$").collect::<Vec<_>>();
    for _ in 0..4 {
        parts.remove(0);
    }
    parts.join("$").to_string()
}

#[tauri::command]
fn get_service_list() -> String {
    let content: String = get_services();
    content
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![passwordify, get_service_list])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn check_service_path() {
    if !Path::new(SERVICE_FILENAME).exists() {
        File::create(SERVICE_FILENAME).unwrap();
    }
}

fn get_services() -> String {
    check_service_path();
    let mut file = File::open(SERVICE_FILENAME).unwrap();
    let mut content = String::new();
    file.read_to_string(&mut content).unwrap();

    content
}

#[allow(dead_code)]
fn save_service(service: &str) {
    check_service_path();
    let mut content: String = get_services();
    if !content.contains(service) {
        content += format!("{}\n", service).as_str();
        fs::write(SERVICE_FILENAME, content).unwrap();
    }
}