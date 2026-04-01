// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod observability;

use rusty_ytdl::{Video, VideoOptions, VideoQuality, VideoSearchOptions};
use serde::Serialize;
use std::fmt;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
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

fn ensure_output_dir(output_dir: &PathBuf) -> Result<(), String> {
    if !output_dir.exists() {
        fs::create_dir_all(output_dir)
            .map_err(|e| format!("Falha ao criar diretório de saída: {}", e))?;
    }
    Ok(())
}

fn get_log_dir(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    use tauri::Manager;
    app.path().app_log_dir().ok()
}

fn append_to_log(app: &tauri::AppHandle, message: &str) {
    use std::io::Write;
    use std::time::{SystemTime, UNIX_EPOCH};
    let Some(log_dir) = get_log_dir(app) else { return };
    if fs::create_dir_all(&log_dir).is_err() { return }
    let log_path = log_dir.join("download.log");
    let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&log_path) else { return };
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let _ = writeln!(file, "[{}] {}", ts, message);
}

#[tauri::command]
fn get_log_path(app: tauri::AppHandle) -> Option<String> {
    get_log_dir(&app).map(|dir| dir.join("download.log").to_string_lossy().into_owned())
}

fn resolve_sidecar_dir(app: &tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    let exe_path = app
        .path()
        .resolve(".", tauri::path::BaseDirectory::Executable)
        .map_err(|e| format!("Cannot resolve executable directory: {}", e))?;
    exe_path
        .to_str()
        .ok_or_else(|| "Invalid executable directory encoding".to_string())
        .map(|s| s.to_string())
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

    let ffmpeg_dir = resolve_sidecar_dir(&app).map_err(|e| {
        let err = DownloadError(format!("Cannot resolve sidecar directory: {}", e));
        append_to_log(&app, &err.to_string());
        observability::capture_error(&err);
        err
    })?;

    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| {
            let err = DownloadError(format!("Failed to locate yt-dlp sidecar: {}", e));
            append_to_log(&app, &err.to_string());
            observability::capture_error(&err);
            err
        })?
        .args([
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "--ffmpeg-location", &ffmpeg_dir,
            "-o", &output_path_str,
            &youtube_url,
        ])
        .output()
        .await
        .map_err(|e| {
            let err = DownloadError(format!("Failed to execute yt-dlp: {}", e));
            append_to_log(&app, &err.to_string());
            observability::capture_error(&err);
            err
        })?;

    if output.status.success() {
        Ok(format!("Download complete: {}", output_file.display()))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
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
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            fetch_video_info,
            download_audio_as_mp3,
            show_in_folder,
            trigger_test_error,
            get_log_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
