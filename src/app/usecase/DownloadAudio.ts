"use client"

import { invoke } from '@tauri-apps/api/tauri';
import DownloadAudioRequest from "@/app/domain/model/DownloadAudioRequest";
import DownloadAudioResponse from "@/app/domain/model/DownloadAudioResponse";

export default class DownloadAudio {

    public async execute(request: DownloadAudioRequest): Promise<DownloadAudioResponse> {
        const { videoUrl, outputPath, fileName } = request;
        console.log('videoURL', videoUrl)
        const videoId = this.getYouTubeVideoId(videoUrl);
        console.log('videoId', videoId);
        const info = await invoke('download_audio_as_mp3', { videoId, outputPath, fileName });
        console.log(info);
        return new DownloadAudioResponse(videoUrl);
    }

    private getYouTubeVideoId(url: string): string | null {
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
        const matches = url.match(regex);
        return (matches && matches[1]) ? matches[1] : null;
    }

}
