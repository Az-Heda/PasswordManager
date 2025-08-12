use {
    argon2::{password_hash::Salt, Argon2, PasswordHasher},
    base64::{self, Engine},
    rusqlite::{params, Connection, Result},
    std::{fmt::Debug, path::Path},
    Vec,
};

const DB_NAME: &str = "services.sqlite3";
const SQLITE_ERROR: &str = "Sqlite3 error";

#[derive(Debug, Clone)]
#[derive(serde::Serialize)]
struct Service {
    key: String,
    name: String,
}

#[tauri::command]
fn passwordify(password: &str, service: &str, max_length: usize) -> String {
    let mut var_salt = String::from(service);
    while var_salt.len() < 16 {
        var_salt += service;
    }
    let mut b64 = base64::prelude::BASE64_STANDARD.encode(var_salt);
    b64 = b64.replace("=", "");
    let s = Salt::from_b64(b64.as_str()).unwrap();

    let params = argon2::Params::new(2048, 3, 3, Some(64));
    if params.is_err() {
        dbg!(params.err());
        return String::new();
    }

    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        argon2::Version::V0x13,
        params.unwrap(),
    );

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
fn get_service_list() -> Vec<Service> {
    let content: Result<Vec<Service>> = get_services();
    content.unwrap_or_default()
}

#[tauri::command]
fn add_service(key: &str, service: &str) -> bool {
    db_add_service(key, service).is_ok()
}

#[tauri::command]
fn remove_service(key: &str, service: &str) -> bool {
    db_remove_service(key, service).is_ok()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_db().expect(SQLITE_ERROR);
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            passwordify,
            get_service_list,
            add_service,
            remove_service,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn get_services() -> Result<Vec<Service>> {
    let data = db_get_services()?;
    Ok(data)
}

fn db_add_service(service_key: &str, service_name: &str) -> Result<()> {
    let conn = Connection::open(DB_NAME)?;

    conn.execute(
        "INSERT INTO services(service_key, service_name) VALUES (?1, ?2)",
        params![service_key, service_name],
    )?;

    Ok(())
}

fn db_remove_service(service_key: &str, service_name: &str) -> Result<()> {
    let conn = Connection::open(DB_NAME)?;

    conn.execute(
        "DELETE FROM services WHERE service_key = ?1 AND service_name = ?2",
        params![service_key, service_name],
    )?;

    Ok(())
}

fn db_get_services() -> Result<Vec<Service>> {
    let mut data: Vec<Service> = Vec::new();
    let conn = Connection::open(DB_NAME)?;
    let mut stmt =
        conn.prepare("SELECT service_key, service_name FROM services ORDER BY created_at ASC;")?;

    let services = stmt.query_map([], |row| {
        Ok(Service {
            key: row.get(0)?,
            name: row.get(1)?,
        })
    })?;

    for s in services {
        if let Ok(ok_service) = s {
            data.push(ok_service);
        }
    }

    Ok(data)
}

fn init_db() -> Result<()> {
    if !Path::new(DB_NAME).exists() {
        let conn = Connection::open(DB_NAME)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS services (
                    service_key TEXT,
                    service_name TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp,
                    UNIQUE(service_name, service_key)
                );",
            (),
        )?;
    }
    Ok(())
}
