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
        // const { title, author } = await invoke<VideoInvoke>('fetch_video_info', { videoUrl });
        // console.log(title, author);


        try {
            const { title, author } = await invoke<VideoInvoke>('fetch_video_info', { videoUrl });
            // Processar os resultados ou fazer algo com title e author
            console.log(title, author);
            return new VideoInfoResponse(title, author);
        } catch (error) {
            console.error('Erro ao buscar informações do vídeo:', error);
            // Você pode informar ao usuário sobre o erro, ou tomar outra ação, como tentar novamente
            return new VideoInfoResponse('', '');
        }




    }

}
