use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Listener, Manager, Runtime,
};
use tauri_plugin_autostart::ManagerExt;

pub fn setup<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let autostart = app.autolaunch();
    let autostart_enabled = autostart.is_enabled().unwrap_or(false);

    let show_item = MenuItem::with_id(app, "show", "顯示主視窗", true, None::<&str>)?;
    let autostart_item = CheckMenuItem::with_id(
        app,
        "autostart",
        "開機自啟",
        true,
        autostart_enabled,
        None::<&str>,
    )?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[&show_item, &sep1, &autostart_item, &sep2, &quit_item],
    )?;

    let autostart_clone = autostart_item.clone();

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| tauri::Error::AssetNotFound("default window icon".into()))?;

    let _tray = TrayIconBuilder::with_id("main")
        .tooltip("Todo Reminder")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "show" => show_main_window(app),
            "autostart" => {
                let mgr = app.autolaunch();
                let enabled = mgr.is_enabled().unwrap_or(false);
                let result = if enabled { mgr.disable() } else { mgr.enable() };
                match result {
                    Ok(_) => {
                        let _ = autostart_clone.set_checked(!enabled);
                        log::info!("autostart -> {}", !enabled);
                    }
                    Err(e) => {
                        log::error!("autostart 切換失敗: {e}");
                        let _ = autostart_clone.set_checked(enabled);
                    }
                }
            }
            "quit" => {
                log::info!("tray: quit requested");
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    // When the settings dialog toggles autostart, the frontend emits this event
    // so the tray menu's check item stays in sync.
    let autostart_for_event = autostart_item.clone();
    app.listen("autostart-changed", move |event| {
        let enabled: bool = serde_json::from_str(event.payload()).unwrap_or(false);
        let _ = autostart_for_event.set_checked(enabled);
    });

    Ok(())
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
