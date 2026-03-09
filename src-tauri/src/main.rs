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

// struct VideoInfoError {
//   message: String,
// }

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
    // let video = Video::new(video_url).unwrap();
    let video = Video::new(video_url).map_err(|_| VideoInfoError::VideoNotFound)?;

    let video_info = video.get_info().await.map_err(|e| {
        // Aqui você pode mapear outros tipos de erro específicos
        println!("opa {:#?}", e);
        match e {
            _ => VideoInfoError::UnknownError(e.to_string()),
        }
    })?;
    // println!("{:#?}",video_info);

    Ok(VideoInfo {
        title: video_info.video_details.title,
        author: video_info.video_details.author.unwrap().name,
        message: "".to_string(),
    })

    // match video_info {
    //   Ok(video_info) => {
    //     Ok(VideoInfo {
    //       title: video_info.video_details.title,
    //       author: video_info.video_details.author.unwrap().name,
    //       message: "".to_string()
    //     })
    //   }
    //
    //   Err(e) => {
    //     // Se a resposta for um erro, retorne nosso erro personalizado
    //     Ok(VideoInfo {
    //       title: "".to_string(),
    //       author: "".to_string(),
    //       message: e
    //     })
    //   }
    // }
}

// #[tauri::command]
// async fn download_audio_as_mp3(video_url: String, output_path: String, file_name: String) -> Result<String, String> {
//   let output_dir = PathBuf::from(output_path.clone());
//   let video = Video::new(video_url).unwrap();
//   let path = output_dir.join(file_name);
//   video.download(path).await.unwrap();
//   Ok(format!("Audio downloaded to {:?}", output_path))
// }

// #[tauri::command]
// async fn download_audio_as_mp32() {
//     let url = "FZ8BxMU3BYc";
//
//     let video_options = VideoOptions {
//         quality: VideoQuality::Highest,
//         filter: VideoSearchOptions::VideoAudio,
//         ..Default::default()
//     };
//
//     let path = "/file.mp3"; // specify path here
//
//     let mut file = File::create(path)?;
//
//     let video = Video::new_with_options(url, video_options).unwrap();
//
//     let stream = video
//         .stream_with_ffmpeg(Some(FFmpegArgs {
//             format: Some("mp3".to_string()),
//             audio_filter: Some("aresample=48000,asetrate=48000*0.8".to_string()),
//             video_filter: Some("eq=brightness=150:saturation=2".to_string()),
//         }))
//         .await
//         .unwrap();
//
//     while let Some(chunk) = stream.chunk().await.unwrap() {
//         // println!("{:#?}", chunk);
//         if let Err(e) = file.write_all(&chunk) {
//             eprintln!("Failed to write to file: {}", e);
//             break;
//         }
//     }
// }

#[tauri::command]
async fn download_audio_as_mp3(video_id: String, output_path: String, file_name: String) -> Result<String, String> {
    let output_dir = PathBuf::from(&output_path);
    if !output_dir.exists() {
        fs::create_dir_all(&output_dir)
            .map_err(|e| format!("Falha ao criar diretório de saída: {}", e))?;
    }

    let output_file = output_dir.join(&file_name);
    let youtube_url = format!("https://www.youtube.com/watch?v={}", video_id);

    // Usar .output() em vez de .spawn() + .wait() para evitar deadlock:
    // com Stdio::piped() sem consumir o output, o processo filho bloqueia
    // quando o buffer do SO fica cheio, travando child.wait() indefinidamente.
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

#[tauri::command]
fn show_in_folder(path: String) {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &path]) // The comma after select is not a typo
            .spawn()
            .unwrap();
    }

    // #[cfg(target_os = "linux")]
    // {
    //   if path.contains(",") {
    //     // see https://gitlab.freedesktop.org/dbus/dbus/-/issues/76
    //     let new_path = match metadata(&path).unwrap().is_dir() {
    //       true => path,
    //       false => {
    //         let mut path2 = PathBuf::from(path);
    //         path2.pop();
    //         path2.into_os_string().into_string().unwrap()
    //       }
    //     };
    //     Command::new("xdg-open")
    //         .arg(&new_path)
    //         .spawn()
    //         .unwrap();
    //   } else {
    //     if let Ok(Fork::Child) = daemon(false, false) {
    //       Command::new("dbus-send")
    //           .args(["--session", "--dest=org.freedesktop.FileManager1", "--type=method_call",
    //             "/org/freedesktop/FileManager1", "org.freedesktop.FileManager1.ShowItems",
    //             format!("array:string:\"file://{path}\"").as_str(), "string:\"\""])
    //           .spawn()
    //           .unwrap();
    //     }
    //   }
    // }

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
