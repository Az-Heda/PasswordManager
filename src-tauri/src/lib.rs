use std::{
    fs::{self, File},
    io::Read,
    path::Path,
};

use argon2::{password_hash::Salt, Argon2, PasswordHasher};
use base64::{self, Engine};

const SERVICE_FILENAME: &str = "services.txt";

#[tauri::command]
fn passwordify(password: &str, service: &str, max_length: usize) -> String {
    let mut var_salt = String::from(service);
    while var_salt.len() < 16 {
        var_salt += service;
    }
    let mut b64 =
        base64::prelude::BASE64_STANDARD.encode(var_salt);
    b64 = b64.replace("=", "");
    let s = Salt::from_b64(b64.as_str()).unwrap();
    let argon2 = Argon2::default();
    let hash = argon2.hash_password(password.as_bytes(), s).unwrap();
    let hash_string = hash.to_string();
    let parts = hash_string.split("$").collect::<Vec<_>>();
    let psw = String::from(parts.last().copied().unwrap());
    if psw.len() < max_length {
        return psw;
    }
    let mut partial_password = String::new();
    let chars: Vec<_> = psw.chars().collect();
    while partial_password.len() < max_length {
        partial_password.push(chars[partial_password.len()]);
    }
    partial_password
}

#[tauri::command]
fn get_service_list() -> String {
    let content: String = get_services();
    content
}

#[tauri::command]
fn add_service(key: &str, service: &str) -> String {
    save_service(key, service)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![passwordify, get_service_list, add_service])
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

fn save_service(key: &str, service: &str) -> String {
    check_service_path();
    let mut content: String = get_services();
    if !content.contains(service) {
        content += format!("{}{}->{}\n", key, '}', service).as_str();
        fs::write(SERVICE_FILENAME, content.clone()).unwrap();
    }
    content
}