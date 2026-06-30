//! Windows power-resume listener: fires due reminders immediately after wake from sleep.

use std::sync::Arc;

use sqlx::SqlitePool;
use tauri::AppHandle;
use windows_sys::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
use windows_sys::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, DispatchMessageW, GetMessageW, GetWindowLongPtrW,
    RegisterClassW, SetWindowLongPtrW, TranslateMessage, CS_HREDRAW, CS_VREDRAW, GWLP_USERDATA,
    HWND_MESSAGE, MSG, WNDCLASSW, WM_POWERBROADCAST,
};

const PBT_APMRESUMEAUTOMATIC: WPARAM = 0x12;
const PBT_APMRESUMESUSPEND: WPARAM = 0x07;

struct PowerContext {
    app: AppHandle,
    pool: Arc<SqlitePool>,
}

pub fn start_resume_listener(app: AppHandle, pool: Arc<SqlitePool>) {
    std::thread::Builder::new()
        .name("power-resume".into())
        .spawn(move || {
            if let Err(e) = run_message_loop(app, pool) {
                log::error!("power resume listener 失敗: {e}");
            }
        })
        .expect("spawn power-resume thread");
}

fn run_message_loop(app: AppHandle, pool: Arc<SqlitePool>) -> Result<(), String> {
    unsafe {
        let class_name: Vec<u16> = "TodoReminderPowerWnd\0".encode_utf16().collect();

        let wc = WNDCLASSW {
            style: CS_HREDRAW | CS_VREDRAW,
            lpfnWndProc: Some(wnd_proc),
            hInstance: GetModuleHandleW(std::ptr::null()),
            lpszClassName: class_name.as_ptr(),
            ..std::mem::zeroed()
        };

        if RegisterClassW(&wc) == 0 {
            return Err("RegisterClassW 失敗".into());
        }

        let hwnd = CreateWindowExW(
            0,
            class_name.as_ptr(),
            std::ptr::null(),
            0,
            0,
            0,
            0,
            0,
            HWND_MESSAGE,
            std::ptr::null_mut(),
            GetModuleHandleW(std::ptr::null()),
            std::ptr::null_mut(),
        );

        if hwnd.is_null() {
            return Err("CreateWindowExW 失敗".into());
        }

        let ctx = Box::new(PowerContext { app, pool });
        SetWindowLongPtrW(hwnd, GWLP_USERDATA, Box::into_raw(ctx) as _);

        log::info!("power: resume listener started");

        let mut msg = std::mem::zeroed::<MSG>();
        while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }

    Ok(())
}

unsafe extern "system" fn wnd_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match msg {
        WM_POWERBROADCAST if wparam == PBT_APMRESUMEAUTOMATIC || wparam == PBT_APMRESUMESUSPEND => {
            let ctx = GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *mut PowerContext;
            if !ctx.is_null() {
                let ctx = &*ctx;
                let app = ctx.app.clone();
                let pool = ctx.pool.clone();
                log::info!("power: system resumed, firing due reminders");
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = crate::scheduler::fire_due(&pool, &app).await {
                        log::error!("power resume fire_due 失敗: {e}");
                    }
                });
            }
            1
        }
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}
