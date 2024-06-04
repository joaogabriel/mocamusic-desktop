"use client"

import ytdl from 'ytdl-core';
import { invoke } from '@tauri-apps/api/tauri';

export default class GetVideoInfo {

    public execute(videoURL: string): string {
        return 'info';
    }

    public async getVideoInfo(videoUrl: string) {
        console.log('videoURL', videoUrl)
        const info = await invoke('fetch_video_info', { videoUrl });
        console.log(info);
        // const {
        //     player_response: {
        //         videoDetails: {title, author},
        //     },
        // } = await ytdl.getInfo(videoURL);
        // return {
        //     title,
        //     author,
        // };
    }

    public async download(videoUrl: string) {
        console.log('videoURL', videoUrl)
        const outputPath = '/Users/joaogabriel/env-dev/temp/mp3-downloads';
        const fileName = 'audio.mp3';
        const info = await invoke('download_audio_as_mp3', { videoUrl, outputPath, fileNamer });
        console.log(info);
    }

}
