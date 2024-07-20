"use client"

import VideoInfoRequest from "@/app/domain/model/VideoInfoRequest";
import VideoInfoResponse from "@/app/domain/model/VideoInfoResponse";
import InvokeGateway from "@/app/gateway/InvokeGateway";

type VideoInvoke = {
    title: string,
    author: string
}

export default class GetVideoInfo {

    private invokeGateway: InvokeGateway;

    constructor(invokeGateway: InvokeGateway) {
        this.invokeGateway = invokeGateway;
    }

    public async execute(request: VideoInfoRequest): Promise<VideoInfoResponse> {
        const videoUrl = request.videoUrl;
        console.log('videoURL', videoUrl)

        try {
            const { title, author } = await this.invokeGateway.invoke<VideoInvoke>(
                'fetch_video_info',
                { videoUrl }
            );
            console.log(title, author);
            return new VideoInfoResponse(title, author);
        } catch (error) {
            console.error('Erro ao buscar informações do vídeo:', error);
            return new VideoInfoResponse('', '');
        }

    }

}
