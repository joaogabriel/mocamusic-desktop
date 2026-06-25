// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod observability;

use rusty_ytdl::{Video, VideoOptions, VideoQuality, VideoSearchOptions};
use serde::Serialize;
use std::fmt;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_shell::ShellExt;

#[derive(Serialize)]
struct VideoInfo {
    title: String,
    author: String,
    message: String,
}

#[derive(Debug, Serialize)]
enum VideoInfoError {
    VideoNotFound,
    NetworkError,
    UnknownError(String),
}

impl fmt::Display for VideoInfoError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            VideoInfoError::VideoNotFound => write!(f, "Video not found"),
            VideoInfoError::NetworkError => write!(f, "Network error occurred"),
            VideoInfoError::UnknownError(msg) => write!(f, "An unknown error occurred: {}", msg),
        }
    }
}

impl std::error::Error for VideoInfoError {}

#[derive(Debug, Serialize)]
#[serde(transparent)]
struct DownloadError(String);

impl fmt::Display for DownloadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for DownloadError {}

const DEEP_LINK_SCHEME_PREFIX: &str = "mocamusic://";
const DEEP_LINK_ACTION: &str = "download";
const DEEP_LINK_URL_PARAM: &str = "url";

fn decode_percent_encoded(input: &str) -> Option<String> {
    let bytes = input.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'%' => {
                if i + 3 > bytes.len() {
                    return None;
                }
                let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).ok()?;
                decoded.push(u8::from_str_radix(hex, 16).ok()?);
                i += 3;
            }
            b'+' => {
                decoded.push(b' ');
                i += 1;
            }
            byte => {
                decoded.push(byte);
                i += 1;
            }
        }
    }
    String::from_utf8(decoded).ok()
}

fn parse_deep_link_payload(uri: &str) -> Option<String> {
    let rest = uri.strip_prefix(DEEP_LINK_SCHEME_PREFIX)?;
    let (action, query) = rest.split_once('?').unwrap_or((rest, ""));
    if action != DEEP_LINK_ACTION {
        return None;
    }

    query.split('&').find_map(|pair| {
        let (key, value) = pair.split_once('=')?;
        if key != DEEP_LINK_URL_PARAM || value.is_empty() {
            return None;
        }
        decode_percent_encoded(value)
    })
}

const DEEP_LINK_DOWNLOAD_EVENT: &str = "deep-link://download";
const MAIN_WINDOW_LABEL: &str = "main";

struct DeepLinkState(Mutex<Option<String>>);

fn focus_main_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
}

fn store_pending_deep_link(app: &tauri::AppHandle, payload: String) {
    let Some(state) = app.try_state::<DeepLinkState>() else {
        return;
    };
    *state.0.lock().unwrap() = Some(payload);
}

fn parse_deep_link_or_log(app: &tauri::AppHandle, raw_url: &str) -> Option<String> {
    let payload = parse_deep_link_payload(raw_url);
    if payload.is_none() {
        append_to_log(app, &format!("[debug] deep link parse failed: {}", raw_url));
    }
    payload
}

#[tauri::command]
fn take_pending_deep_link(state: tauri::State<DeepLinkState>) -> Option<String> {
    state.0.lock().unwrap().take()
}

#[tauri::command]
async fn fetch_video_info(video_url: String) -> Result<VideoInfo, VideoInfoError> {
    let video = Video::new(video_url).map_err(|_| {
        let err = VideoInfoError::VideoNotFound;
        observability::capture_error(&err);
        err
    })?;

    let video_info = video.get_info().await.map_err(|e| {
        let err = VideoInfoError::UnknownError(e.to_string());
        observability::capture_error(&err);
        err
    })?;

    let author = video_info
        .video_details
        .author
        .map(|a| a.name)
        .unwrap_or_default();

    Ok(VideoInfo {
        title: video_info.video_details.title,
        author,
        message: "".to_string(),
    })
}

fn build_youtube_url(video_id: &str) -> String {
    format!("https://www.youtube.com/watch?v={}", video_id)
}

fn build_output_file(output_path: &str, file_name: &str) -> PathBuf {
    PathBuf::from(output_path).join(file_name)
}

fn resolve_deno_path(sidecar_dir: &str) -> String {
    format!("{}/deno{}", sidecar_dir, std::env::consts::EXE_SUFFIX)
}

fn ensure_output_dir(output_dir: &PathBuf) -> Result<(), String> {
    if !output_dir.exists() {
        fs::create_dir_all(output_dir)
            .map_err(|e| format!("Falha ao criar diretório de saída: {}", e))?;
    }
    Ok(())
}

fn get_log_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path()
        .app_log_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("mocamusic"))
}

fn get_log_file_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    let log_dir = get_log_dir(app);
    if fs::create_dir_all(&log_dir).is_ok() {
        log_dir.join("download.log")
    } else {
        std::env::temp_dir().join("mocamusic-download.log")
    }
}

fn append_to_log(app: &tauri::AppHandle, message: &str) {
    use std::io::Write;
    use std::time::{SystemTime, UNIX_EPOCH};
    let log_path = get_log_file_path(app);
    let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&log_path) else {
        return;
    };
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let _ = writeln!(file, "[{}] {}", ts, message);
}

#[tauri::command]
fn get_log_path(app: tauri::AppHandle) -> String {
    get_log_file_path(&app).to_string_lossy().into_owned()
}

fn resolve_sidecar_dir() -> Result<String, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Cannot resolve executable directory: {}", e))?;
    exe_path
        .parent()
        .ok_or_else(|| "Cannot get executable directory".to_string())
        .and_then(|p| {
            p.to_str()
                .ok_or_else(|| "Invalid executable directory encoding".to_string())
                .map(|s| s.to_string())
        })
}

#[tauri::command]
async fn download_audio_as_mp3(
    app: tauri::AppHandle,
    video_id: String,
    output_path: String,
    file_name: String,
) -> Result<String, DownloadError> {
    let output_dir = PathBuf::from(&output_path);
    ensure_output_dir(&output_dir).map_err(|e| {
        let err = DownloadError(e);
        append_to_log(&app, &err.to_string());
        observability::capture_error(&err);
        err
    })?;

    let output_file = build_output_file(&output_path, &file_name);
    let youtube_url = build_youtube_url(&video_id);

    let output_path_str = output_file.to_str().ok_or_else(|| {
        let err = DownloadError("Invalid output path encoding".to_string());
        append_to_log(&app, &err.to_string());
        observability::capture_error(&err);
        err
    })?.to_string();

    let ffmpeg_dir = resolve_sidecar_dir().map_err(|e| {
        let err = DownloadError(format!("Cannot resolve sidecar directory: {}", e));
        append_to_log(&app, &err.to_string());
        observability::capture_error(&err);
        err
    })?;

    let deno_path = resolve_deno_path(&ffmpeg_dir);
    let deno_found = PathBuf::from(&deno_path).exists();

    append_to_log(&app, &format!(
        "download started: video_id={} output_path={} file_name={} ffmpeg_dir={} deno_path={} deno_found={}",
        video_id, output_path, file_name, ffmpeg_dir, deno_path, deno_found
    ));

    let mut args = vec![
        "-x".to_string(),
        "--audio-format".to_string(), "mp3".to_string(),
        "--audio-quality".to_string(), "0".to_string(),
        "--ffmpeg-location".to_string(), ffmpeg_dir.clone(),
        "-o".to_string(), output_path_str.clone(),
    ];
    if deno_found {
        args.push("--js-runtimes".to_string());
        args.push(format!("deno:{}", deno_path));
    }
    args.push(youtube_url.clone());

    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| {
            let err = DownloadError(format!("Failed to locate yt-dlp sidecar: {}", e));
            append_to_log(&app, &err.to_string());
            observability::capture_error(&err);
            err
        })?
        .args(args)
        .output()
        .await
        .map_err(|e| {
            let err = DownloadError(format!("Failed to execute yt-dlp: {}", e));
            append_to_log(&app, &err.to_string());
            observability::capture_error(&err);
            err
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        append_to_log(&app, &format!("download succeeded. stdout: {}", stdout));
        Ok(format!("Download complete: {}", output_file.display()))
    } else {
        append_to_log(&app, &format!("yt-dlp failed. stderr: {} | stdout: {}", stderr, stdout));
        let err = DownloadError(format!("yt-dlp failed: {}", stderr));
        append_to_log(&app, &err.to_string());
        observability::capture_error(&err);
        Err(err)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    // --- VideoInfoError Display ---

    #[test]
    fn video_not_found_display() {
        assert_eq!(VideoInfoError::VideoNotFound.to_string(), "Video not found");
    }

    #[test]
    fn network_error_display() {
        assert_eq!(VideoInfoError::NetworkError.to_string(), "Network error occurred");
    }

    #[test]
    fn unknown_error_display() {
        let err = VideoInfoError::UnknownError("timeout".to_string());
        assert_eq!(err.to_string(), "An unknown error occurred: timeout");
    }

    #[test]
    fn unknown_error_empty_msg() {
        let err = VideoInfoError::UnknownError(String::new());
        assert_eq!(err.to_string(), "An unknown error occurred: ");
    }

    // --- VideoInfoError Serialize ---

    #[test]
    fn video_info_error_serializes_to_json() {
        let err = VideoInfoError::UnknownError("bad request".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("bad request"));
    }

    // --- VideoInfoError implements std::error::Error ---

    #[test]
    fn video_info_error_implements_std_error() {
        let err = VideoInfoError::VideoNotFound;
        let _: &dyn std::error::Error = &err;
    }

    // --- DownloadError ---

    #[test]
    fn download_error_display() {
        let err = DownloadError("yt-dlp falhou".to_string());
        assert_eq!(err.to_string(), "yt-dlp falhou");
    }

    #[test]
    fn download_error_serializes_as_string() {
        let err = DownloadError("some error".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert_eq!(json, "\"some error\"");
    }

    #[test]
    fn download_error_implements_std_error() {
        let err = DownloadError("test".to_string());
        let _: &dyn std::error::Error = &err;
    }

    // --- build_youtube_url ---

    #[test]
    fn youtube_url_contains_video_id() {
        let url = build_youtube_url("dQw4w9WgXcQ");
        assert_eq!(url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    }

    #[test]
    fn youtube_url_empty_id() {
        let url = build_youtube_url("");
        assert_eq!(url, "https://www.youtube.com/watch?v=");
    }

    // --- build_output_file ---

    #[test]
    fn output_file_joins_path_and_name() {
        let result = build_output_file("/tmp/music", "song.mp3");
        assert_eq!(result, PathBuf::from("/tmp/music/song.mp3"));
    }

    #[test]
    fn output_file_handles_trailing_slash() {
        let result = build_output_file("/tmp/music/", "track.mp3");
        assert_eq!(result, PathBuf::from("/tmp/music/track.mp3"));
    }

    // --- resolve_deno_path ---

    #[test]
    fn deno_path_joins_dir_and_executable_name() {
        let result = resolve_deno_path("/tmp/sidecars");
        assert_eq!(result, format!("/tmp/sidecars/deno{}", std::env::consts::EXE_SUFFIX));
    }

    // --- ensure_output_dir ---

    #[test]
    fn ensure_output_dir_creates_nested_dirs() {
        let tmp = tempfile::tempdir().unwrap();
        let nested = tmp.path().join("a").join("b").join("c");
        assert!(!nested.exists());
        ensure_output_dir(&nested).unwrap();
        assert!(nested.exists());
    }

    #[test]
    fn ensure_output_dir_is_idempotent() {
        let tmp = tempfile::tempdir().unwrap();
        let dir = tmp.path().join("music");
        ensure_output_dir(&dir).unwrap();
        // chamar novamente não deve falhar
        ensure_output_dir(&dir).unwrap();
        assert!(dir.exists());
    }

    // --- VideoInfo Serialize ---

    #[test]
    fn video_info_serializes_correctly() {
        let info = VideoInfo {
            title: "My Song".to_string(),
            author: "Artist".to_string(),
            message: String::new(),
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["title"], "My Song");
        assert_eq!(json["author"], "Artist");
        assert_eq!(json["message"], "");
    }

    // --- parse_deep_link_payload ---

    #[test]
    fn parse_deep_link_payload_decodes_encoded_url() {
        let payload =
            parse_deep_link_payload("mocamusic://download?url=https%3A%2F%2Fyoutu.be%2FdQw4w9WgXcQ");
        assert_eq!(payload, Some("https://youtu.be/dQw4w9WgXcQ".to_string()));
    }

    #[test]
    fn parse_deep_link_payload_accepts_non_encoded_url() {
        let payload = parse_deep_link_payload("mocamusic://download?url=https://youtu.be/dQw4w9WgXcQ");
        assert_eq!(payload, Some("https://youtu.be/dQw4w9WgXcQ".to_string()));
    }

    #[test]
    fn parse_deep_link_payload_returns_none_when_url_param_missing() {
        let payload = parse_deep_link_payload("mocamusic://download");
        assert_eq!(payload, None);
    }

    #[test]
    fn parse_deep_link_payload_returns_none_when_url_param_empty() {
        let payload = parse_deep_link_payload("mocamusic://download?url=");
        assert_eq!(payload, None);
    }

    #[test]
    fn parse_deep_link_payload_returns_none_for_unknown_action() {
        let payload = parse_deep_link_payload("mocamusic://upload?url=https%3A%2F%2Fyoutu.be%2Fabc");
        assert_eq!(payload, None);
    }

    #[test]
    fn parse_deep_link_payload_returns_none_for_wrong_scheme() {
        let payload =
            parse_deep_link_payload("wrongscheme://download?url=https%3A%2F%2Fyoutu.be%2Fabc");
        assert_eq!(payload, None);
    }

    #[test]
    fn parse_deep_link_payload_returns_none_for_empty_string() {
        let payload = parse_deep_link_payload("");
        assert_eq!(payload, None);
    }

    #[test]
    fn parse_deep_link_payload_returns_none_for_malformed_string() {
        let payload = parse_deep_link_payload("not a url");
        assert_eq!(payload, None);
    }

    // --- DeepLinkState ---

    #[test]
    fn deep_link_state_starts_empty() {
        let state = DeepLinkState(Mutex::new(None));
        assert_eq!(state.0.lock().unwrap().take(), None);
    }

    #[test]
    fn deep_link_state_take_drains_stored_payload() {
        let state = DeepLinkState(Mutex::new(Some("https://youtu.be/abc".to_string())));
        let payload = state.0.lock().unwrap().take();
        assert_eq!(payload, Some("https://youtu.be/abc".to_string()));
    }

    #[test]
    fn deep_link_state_second_take_returns_none() {
        let state = DeepLinkState(Mutex::new(Some("https://youtu.be/abc".to_string())));
        let _ = state.0.lock().unwrap().take();
        assert_eq!(state.0.lock().unwrap().take(), None);
    }

    #[test]
    fn deep_link_state_latest_write_replaces_previous_payload() {
        let state = DeepLinkState(Mutex::new(Some("https://youtu.be/first".to_string())));
        *state.0.lock().unwrap() = Some("https://youtu.be/second".to_string());
        assert_eq!(
            state.0.lock().unwrap().take(),
            Some("https://youtu.be/second".to_string())
        );
    }
}

#[derive(Debug)]
struct TestError(String);

impl fmt::Display for TestError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for TestError {}

#[tauri::command]
fn trigger_test_error() {
    let err = TestError("Sentry test error from Rust backend".to_string());
    observability::capture_error(&err);
}

#[tauri::command]
fn show_in_folder(path: String) {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &path]) // The comma after select is not a typo
            .spawn()
            .unwrap();
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open").args(["-R", &path]).spawn().unwrap();
    }
}

fn main() {
    let _sentry = observability::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            focus_main_window(app);
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(DeepLinkState(Mutex::new(None)))
        .setup(|app| {
            let app_handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let payload = event
                    .urls()
                    .iter()
                    .rev()
                    .find_map(|url| parse_deep_link_or_log(&app_handle, &url.to_string()));

                let Some(payload) = payload else {
                    return;
                };
                store_pending_deep_link(&app_handle, payload.clone());
                focus_main_window(&app_handle);
                let _ = app_handle.emit(DEEP_LINK_DOWNLOAD_EVENT, payload);
            });

            if let Ok(Some(urls)) = app.deep_link().get_current() {
                for url in urls {
                    if let Some(payload) = parse_deep_link_or_log(app.handle(), &url.to_string()) {
                        store_pending_deep_link(app.handle(), payload);
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fetch_video_info,
            download_audio_as_mp3,
            show_in_folder,
            trigger_test_error,
            get_log_path,
            take_pending_deep_link
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
