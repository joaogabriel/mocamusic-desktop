"use client"

import { invoke } from '@tauri-apps/api/tauri';
import VideoInfoRequest from "@/app/domain/model/VideoInfoRequest";
import VideoInfoResponse from "@/app/domain/model/VideoInfoResponse";

type VideoInvoke = {
    title: string,
    author: string
}
export default class GetVideoInfo {

    public async execute(request: VideoInfoRequest): Promise<VideoInfoResponse> {
        const videoUrl = request.videoUrl;
        console.log('videoURL', videoUrl)
        const { title, author } = await invoke<VideoInvoke>('fetch_video_info', { videoUrl });
        console.log(title, author);
        return new VideoInfoResponse(title, author);
    }

}
