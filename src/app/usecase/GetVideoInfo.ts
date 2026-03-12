"use client"

import { invoke } from '@tauri-apps/api/core';
import VideoInfoRequest from "@/app/domain/model/VideoInfoRequest";
import VideoInfoResponse from "@/app/domain/model/VideoInfoResponse";

type VideoInvoke = {
    title: string,
    author: string
}

export default class GetVideoInfo {

    public async execute(request: VideoInfoRequest): Promise<VideoInfoResponse> {
        const videoUrl = request.videoUrl;

        try {
            const { title, author } = await invoke<VideoInvoke>('fetch_video_info', { videoUrl });
            return new VideoInfoResponse(title, author);
        } catch (error) {
            console.error('Erro ao buscar informações do vídeo:', error);
            return new VideoInfoResponse('', '');
        }
        
    }

}
