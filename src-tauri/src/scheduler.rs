use std::time::Duration;

use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager, UserAttentionType};
use tokio::time::interval;

const TICK_SECS: u64 = 30;
const APP_AUMID: &str = "com.lenvovo.todoreminder";

#[derive(Debug, sqlx::FromRow)]
struct PendingReminder {
    id: i64,
    title: String,
    description: Option<String>,
}

pub async fn start(app: AppHandle) -> Result<(), String> {
    let db_path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("取 app_data_dir 失敗: {e}"))?
        .join("todo.db");

    let db_url = format!(
        "sqlite://{}?mode=rwc",
        db_path.display().to_string().replace('\\', "/")
    );

    let pool = SqlitePoolOptions::new()
        .max_connections(2)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&db_url)
        .await
        .map_err(|e| format!("scheduler 連接 DB 失敗: {e}"))?;

    log::info!("scheduler: connected to {}", db_url);

    tauri::async_runtime::spawn(async move {
        let mut ticker = interval(Duration::from_secs(TICK_SECS));
        loop {
            ticker.tick().await;
            if let Err(e) = fire_due(&pool, &app).await {
                log::error!("scheduler tick 失敗: {e}");
            }
        }
    });

    Ok(())
}

async fn fire_due(pool: &SqlitePool, app: &AppHandle) -> Result<(), String> {
    let now = chrono::Utc::now().timestamp();

    let pending: Vec<PendingReminder> = sqlx::query_as(
        r#"
        SELECT r.id AS id, t.title AS title, t.description AS description
        FROM reminders r
        INNER JOIN tasks t ON t.id = r.task_id
        WHERE r.fired = 0
          AND r.remind_at <= ?
          AND t.status NOT IN ('done', 'cancelled')
        ORDER BY r.remind_at ASC
        LIMIT 20
        "#,
    )
    .bind(now)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("查 pending reminders 失敗: {e}"))?;

    if pending.is_empty() {
        return Ok(());
    }

    log::info!("scheduler: firing {} reminder(s)", pending.len());

    // Resolve icon once per tick — same icon for every notification.
    let icon_path = app
        .path()
        .resolve("icons/icon.png", tauri::path::BaseDirectory::Resource)
        .ok()
        .filter(|p| p.exists());

    for r in &pending {
        let body = r
            .description
            .clone()
            .unwrap_or_else(|| "任務到期，記得處理".into());

        let mut n = notify_rust::Notification::new();
        n.summary(&r.title).body(&body).sound_name("Default");

        #[cfg(windows)]
        {
            n.app_id(APP_AUMID);
        }

        if let Some(ref p) = icon_path {
            n.icon(&p.to_string_lossy());
        }

        if let Err(e) = n.show() {
            log::error!("發送通知失敗 (reminder {}): {e}", r.id);
        }

        if let Err(e) = sqlx::query("UPDATE reminders SET fired = 1 WHERE id = ?")
            .bind(r.id)
            .execute(pool)
            .await
        {
            log::error!("更新 fired 失敗 (reminder {}): {e}", r.id);
        }
    }

    // Flash the taskbar icon to draw attention even if user missed the toast.
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.request_user_attention(Some(UserAttentionType::Critical));
    }

    Ok(())
}
