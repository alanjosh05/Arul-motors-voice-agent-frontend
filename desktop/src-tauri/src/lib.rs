//! Arul Motors ERP desktop app: a window around https://crm.arulmotors.com.
//!
//! - The window starts on a small local splash page (`dist/`) that checks the
//!   connection and then opens the ERP, or shows "Try again" when offline.
//! - Only the ERP itself is shown inside the app. Any other link opens in the
//!   system browser.
//! - Job cards and reports (opened with `window.open`) get their own window.
//! - Downloads (Excel export, backups) go to the Downloads folder and are shown
//!   in Finder / Explorer when done.
//! - The remote site gets no Tauri IPC (no capabilities): it runs like it does
//!   in a browser.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use tauri::webview::{DownloadEvent, NewWindowResponse, PermissionKind, PermissionResponse};
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Wry};
use tauri_plugin_opener::OpenerExt;

const ERP_HOST: &str = "crm.arulmotors.com";
const TITLE: &str = "Arul Motors ERP";

static WINDOW_COUNT: AtomicUsize = AtomicUsize::new(0);

/// Downloads in progress: URL → file path (macOS doesn't report the path when done).
type Downloads = Arc<Mutex<HashMap<String, PathBuf>>>;
type Builder<'a> = WebviewWindowBuilder<'a, Wry, AppHandle>;

/// May this URL be shown inside the app?
fn is_inside(url: &Url) -> bool {
    match url.scheme() {
        "https" => url.host_str() == Some(ERP_HOST),
        // The local splash page: tauri://localhost (macOS), http://tauri.localhost (Windows).
        "tauri" => true,
        "http" => url.host_str() == Some("tauri.localhost"),
        "about" | "blob" | "data" => true,
        _ => false,
    }
}

/// Opens links for the outside world (website, WhatsApp, maps, mail, phone) in
/// the system's own apps.
fn open_outside(app: &AppHandle, url: &Url) {
    if matches!(url.scheme(), "https" | "http" | "mailto" | "tel" | "whatsapp") {
        let _ = app.opener().open_url(url.as_str(), None::<&str>);
    }
}

fn build_window(
    app: &AppHandle,
    label: &str,
    url: WebviewUrl,
    downloads: Downloads,
    // Boxed (not generic): popups call build_window recursively.
    configure: Box<dyn for<'a> FnOnce(Builder<'a>) -> Builder<'a>>,
) -> tauri::Result<WebviewWindow> {
    let nav_app = app.clone();
    let popup_app = app.clone();
    let popup_downloads = downloads.clone();
    let done_app = app.clone();

    let builder = WebviewWindowBuilder::new(app, label, url)
        .title(TITLE)
        .on_navigation(move |url| {
            if is_inside(url) {
                true
            } else {
                open_outside(&nav_app, url);
                false
            }
        })
        .on_new_window(move |url, features| {
            // Links to other sites go to the browser; the ERP's own pop-ups
            // (job card PDFs start as about:blank, then a blob: URL) get a window.
            if !is_inside(&url) {
                open_outside(&popup_app, &url);
                return NewWindowResponse::Deny;
            }
            let n = WINDOW_COUNT.fetch_add(1, Ordering::Relaxed);
            let window = build_window(
                &popup_app,
                &format!("popup-{n}"),
                WebviewUrl::External("about:blank".parse().unwrap()),
                popup_downloads.clone(),
                Box::new(move |b| b.window_features(features).inner_size(900.0, 1000.0).focused(true)),
            );
            match window {
                Ok(window) => NewWindowResponse::Create { window },
                Err(_) => NewWindowResponse::Deny,
            }
        })
        .on_document_title_changed(|window, title| {
            let title = title.trim();
            let _ = window.set_title(if title.is_empty() { TITLE } else { title });
        })
        .on_download(move |_webview, event| {
            match event {
                // Both WebKit and WebView2 suggest a free file name in Downloads.
                DownloadEvent::Requested { url, destination } => {
                    downloads.lock().unwrap().insert(url.to_string(), destination.clone());
                }
                DownloadEvent::Finished { url, path, success } => {
                    let saved = downloads.lock().unwrap().remove(url.as_str());
                    if success {
                        if let Some(file) = path.or(saved) {
                            let _ = done_app.opener().reveal_item_in_dir(file);
                        }
                    }
                }
                _ => {}
            }
            true
        })
        // The voice-agent test call needs the microphone; nothing else is granted.
        .on_permission_request(|_, kind| match kind {
            PermissionKind::Microphone => PermissionResponse::Allow,
            _ => PermissionResponse::Deny,
        });

    configure(builder).build()
}

fn focus_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Opening the app again focuses the window that's already open.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| focus_main(app)))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let downloads: Downloads = Arc::default();
            build_window(
                app.handle(),
                "main",
                WebviewUrl::App("index.html".into()),
                downloads,
                Box::new(|b| b.inner_size(1360.0, 860.0).min_inner_size(900.0, 600.0).center()),
            )?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the Arul Motors ERP app");
}
