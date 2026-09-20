use async_trait::async_trait;
use futures_lite::StreamExt;
use log::warn;
use powersync::error::PowerSyncError;
use powersync::{BackendConnector, PowerSyncCredentials, PowerSyncDatabase, SyncOptions, UpdateType};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use tauri::{AppHandle, Runtime};
use tauri_plugin_powersync::PowerSyncExt;

#[derive(Debug, Deserialize)]
struct CredentialsResponse {
    token: String,
    endpoint: String,
}

#[derive(Serialize)]
struct BackendEntry {
    op: UpdateType,
    table: String,
    id: String,
    data: Option<Map<String, Value>>,
}

#[derive(Serialize)]
struct BackendBatch {
    batch: Vec<BackendEntry>,
}

fn connector_error(message: impl Into<String>) -> PowerSyncError {
    PowerSyncError::upload_error(std::io::Error::new(
        std::io::ErrorKind::Other,
        message.into(),
    ))
}

#[tauri::command]
async fn connect_powersync<R: Runtime>(
    app: AppHandle<R>,
    handle: usize,
    server_url: String,
    better_auth_token: String,
) -> tauri_plugin_powersync::Result<()> {
    let powersync = app.powersync();
    let database = powersync.database_from_javascript_handle(handle)?;

    let connector = RustPowerSyncConnector {
        db: database.clone(),
        server_url: server_url.trim_end_matches('/').to_string(),
        better_auth_token,
        http_client: reqwest::Client::new(),
    };

    let options = SyncOptions::new(connector);
    database.connect(options).await;

    Ok(())
}

#[tauri::command]
async fn disconnect_powersync<R: Runtime>(
    app: AppHandle<R>,
    handle: usize,
) -> tauri_plugin_powersync::Result<()> {
    let powersync = app.powersync();
    let database = powersync.database_from_javascript_handle(handle)?;
    database.disconnect().await;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![connect_powersync, disconnect_powersync])
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_powersync::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

struct RustPowerSyncConnector {
    db: PowerSyncDatabase,
    server_url: String,
    better_auth_token: String,
    http_client: reqwest::Client,
}

#[async_trait]
impl BackendConnector for RustPowerSyncConnector {
    async fn fetch_credentials(&self) -> Result<PowerSyncCredentials, PowerSyncError> {
        let response = self
            .http_client
            .get(format!("{}/api/v2/sync/token", self.server_url))
            .bearer_auth(&self.better_auth_token)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(connector_error(format!(
                "PowerSync credentials request failed with {status}: {body}"
            )));
        }

        let credentials: CredentialsResponse = response.json().await?;

        Ok(PowerSyncCredentials {
            endpoint: credentials.endpoint,
            token: credentials.token,
        })
    }

    async fn upload_data(&self) -> Result<(), PowerSyncError> {
        let mut transactions = self.db.crud_transactions();

        while let Some(mut transaction) = transactions.try_next().await? {
            let entries = std::mem::take(&mut transaction.crud)
                .into_iter()
                .map(|crud| BackendEntry {
                    op: crud.update_type,
                    table: crud.table,
                    id: crud.id,
                    data: crud.data,
                })
                .collect();

            let response = self
                .http_client
                .post(format!("{}/api/v2/sync/upload", self.server_url))
                .bearer_auth(&self.better_auth_token)
                .json(&BackendBatch { batch: entries })
                .send()
                .await?;

            if response.status() != StatusCode::OK {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                warn!("PowerSync upload returned {status}: {body}");
                return Err(connector_error(format!(
                    "PowerSync upload failed with {status}"
                )));
            }

            transaction.complete().await?;
        }

        Ok(())
    }
}
