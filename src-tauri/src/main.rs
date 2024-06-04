// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use rusty_ytdl::{FFmpegArgs, Video, VideoQuality, VideoSearchOptions};
use rusty_ytdl::{choose_format,VideoOptions};
use serde::Serialize;
use tauri::api::path::video_dir;


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


  // let url = "FZ8BxMU3BYc";

  // let video_options = VideoOptions {
  //   quality: VideoQuality::Highest,
  //   filter: VideoSearchOptions::VideoAudio,
  //   ..Default::default()
  // };
  //
  // let video = Video::new_with_options(video_url, video_options).unwrap();
  //
  // let stream = video
  //     .stream_with_ffmpeg(Some(FFmpegArgs {
  //       format: Some("mp3".to_string()),
  //       audio_filter: Some("aresample=48000,asetrate=48000*0.8".to_string()),
  //       video_filter: Some("eq=brightness=150:saturation=2".to_string()),
  //     }))
  //     .await
  //     .unwrap();
  //
  // while let Some(chunk) = stream.chunk().await.unwrap() {
  //   println!("{:#?}", chunk);
  // }




// Cria um PathBuf a partir do output_path fornecido
  let output_dir = PathBuf::from(output_path.clone());

  // let url = "https://www.youtube.com/watch?v=FZ8BxMU3BYc";

  let video = Video::new(video_url).unwrap();

  // let path = std::path::Path::new(r"test.mp3");
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
