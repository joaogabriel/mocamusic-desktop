// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusty_ytdl::{Video};
use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
struct VideoInfo {
  title: String,
  author: String,
}

#[tauri::command]
async fn fetch_video_info(video_url: String) -> Result<VideoInfo, VideoInfo> {
  let video = Video::new(video_url).unwrap();
  let video_info = video.get_info().await.unwrap();
  println!("{:#?}",video_info);

  Ok(VideoInfo {
    title: video_info.video_details.title,
    author: video_info.video_details.author.unwrap().name
  })
}

#[tauri::command]
async fn download_audio_as_mp3(video_url: String, output_path: String, file_name: String) -> Result<String, String> {
  let output_dir = PathBuf::from(output_path.clone());
  let video = Video::new(video_url).unwrap();
  let path = output_dir.join(file_name);
  video.download(path).await.unwrap();
  Ok(format!("Audio downloaded to {:?}", output_path))
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![fetch_video_info, download_audio_as_mp3])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
