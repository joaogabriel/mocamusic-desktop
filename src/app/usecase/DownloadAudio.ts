"use client"

import { invoke } from '@tauri-apps/api/tauri';
import DownloadAudioRequest from "@/app/domain/model/DownloadAudioRequest";
import DownloadAudioResponse from "@/app/domain/model/DownloadAudioResponse";

export default class DownloadAudio {

    public async execute(request: DownloadAudioRequest): Promise<DownloadAudioResponse> {
        const { videoUrl, outputPath, fileName } = request;
        console.log('videoURL', videoUrl)
        const info = await invoke('download_audio_as_mp3', { videoUrl, outputPath, fileName });
        await invoke('download_audio_as_mp32', {  });
        console.log(info);
        return new DownloadAudioResponse(videoUrl);
    }

}
