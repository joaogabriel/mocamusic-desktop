// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusty_ytdl::{Video, VideoOptions, VideoQuality, VideoSearchOptions};
use serde::Serialize;
use std::fmt;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::command;

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

#[tauri::command]
async fn fetch_video_info(video_url: String) -> Result<VideoInfo, VideoInfoError> {
    let video = Video::new(video_url).map_err(|_| VideoInfoError::VideoNotFound)?;

    let video_info = video.get_info().await.map_err(|e| {
        match e {
            _ => VideoInfoError::UnknownError(e.to_string()),
        }
    })?;

    Ok(VideoInfo {
        title: video_info.video_details.title,
        author: video_info.video_details.author.unwrap().name,
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

#[tauri::command]
async fn download_audio_as_mp3(video_id: String, output_path: String, file_name: String) -> Result<String, String> {
    let output_dir = PathBuf::from(&output_path);
    ensure_output_dir(&output_dir)?;

    let output_file = build_output_file(&output_path, &file_name);
    let youtube_url = build_youtube_url(&video_id);

    let output = Command::new("yt-dlp")
        .args([
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "-o", output_file.to_str().unwrap(),
            &youtube_url,
        ])
        .output()
        .map_err(|e| format!("Falha ao iniciar yt-dlp: {}", e))?;

    if output.status.success() {
        Ok(format!("Download completo: {}", output_file.display()))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("yt-dlp falhou: {}", stderr))
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
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            fetch_video_info,
            download_audio_as_mp3,
            show_in_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
