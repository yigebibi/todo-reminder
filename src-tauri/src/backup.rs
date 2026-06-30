use std::path::{Path, PathBuf};
use std::time::Duration;

use chrono::{Duration as ChronoDuration, Local, NaiveDate};
use sqlx::sqlite::SqlitePoolOptions;
use tauri::{AppHandle, Manager};

const RETENTION_DAYS: i64 = 7;
const BACKUP_PREFIX: &str = "todo-";
const BACKUP_SUFFIX: &str = ".db";

fn db_url(db_path: &Path) -> String {
    format!(
        "sqlite://{}?mode=rwc",
        db_path.display().to_string().replace('\\', "/")
    )
}

async fn wal_checkpoint(db_path: &Path) -> Result<(), String> {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&db_url(db_path))
        .await
        .map_err(|e| format!("備份連接 DB 失敗: {e}"))?;

    sqlx::query("PRAGMA wal_checkpoint(FULL)")
        .execute(&pool)
        .await
        .map_err(|e| format!("WAL checkpoint 失敗: {e}"))?;

    pool.close().await;
    Ok(())
}

fn parse_backup_date(filename: &str) -> Option<NaiveDate> {
    let stem = filename.strip_prefix(BACKUP_PREFIX)?.strip_suffix(BACKUP_SUFFIX)?;
    NaiveDate::parse_from_str(stem, "%Y-%m-%d").ok()
}

fn prune_old_backups(backups_dir: &Path) -> Result<(), String> {
    let cutoff = Local::now().date_naive() - ChronoDuration::days(RETENTION_DAYS);

    let entries = std::fs::read_dir(backups_dir).map_err(|e| format!("讀取備份目錄失敗: {e}"))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("讀取備份項目失敗: {e}"))?;
        let name = entry.file_name();
        let name = name.to_string_lossy();

        if !name.starts_with(BACKUP_PREFIX) || !name.ends_with(BACKUP_SUFFIX) {
            continue;
        }

        let Some(file_date) = parse_backup_date(&name) else {
            continue;
        };

        if file_date < cutoff {
            std::fs::remove_file(entry.path())
                .map_err(|e| format!("刪除舊備份 {} 失敗: {e}", name))?;
            log::info!("backup: pruned old backup {}", name);
        }
    }

    Ok(())
}

pub async fn run_daily_if_needed(app: &AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("取 app_data_dir 失敗: {e}"))?;

    let db_path = app_data_dir.join("todo.db");
    if !db_path.exists() {
        log::info!("backup: skip (no todo.db yet)");
        return Ok(());
    }

    let backups_dir = app_data_dir.join("backups");
    std::fs::create_dir_all(&backups_dir).map_err(|e| format!("建立備份目錄失敗: {e}"))?;

    let today = Local::now().format("%Y-%m-%d").to_string();
    let backup_name = format!("{BACKUP_PREFIX}{today}{BACKUP_SUFFIX}");
    let backup_path: PathBuf = backups_dir.join(&backup_name);

    if backup_path.exists() {
        log::info!("backup: skip (already backed up today as {})", backup_name);
    } else {
        wal_checkpoint(&db_path).await?;
        std::fs::copy(&db_path, &backup_path)
            .map_err(|e| format!("複製 DB 到 {} 失敗: {e}", backup_path.display()))?;
        log::info!("backup: created {}", backup_path.display());
    }

    prune_old_backups(&backups_dir)?;
    Ok(())
}
