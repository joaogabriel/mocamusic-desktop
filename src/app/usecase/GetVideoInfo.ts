"use client"

import { invoke } from '@tauri-apps/api/core';
import VideoInfoRequest from "@/app/domain/model/VideoInfoRequest";
import VideoInfoResponse from "@/app/domain/model/VideoInfoResponse";

type VideoInvoke = {
    title: string,
    author: string
}

const VIDEO_INFO_ERROR_MESSAGES: Record<string, string> = {
    VideoNotFound: 'Vídeo não encontrado. Verifique se o link está correto.',
    NetworkError: 'Erro de rede. Verifique sua conexão e tente novamente.',
};

const UNKNOWN_VIDEO_ERROR_MESSAGE = 'Não foi possível obter informações do vídeo. Ele pode ser privado ou restrito.';

function resolveVideoInfoErrorMessage(error: unknown): string {
    if (typeof error === 'string' && error in VIDEO_INFO_ERROR_MESSAGES) {
        return VIDEO_INFO_ERROR_MESSAGES[error];
    }
    return UNKNOWN_VIDEO_ERROR_MESSAGE;
}

export default class GetVideoInfo {

    public async execute(request: VideoInfoRequest): Promise<VideoInfoResponse> {
        const videoUrl = request.videoUrl;
        try {
            const { title, author } = await invoke<VideoInvoke>('fetch_video_info', { videoUrl });
            return new VideoInfoResponse(title, author);
        } catch (error) {
            console.error('Erro ao buscar informações do vídeo:', error);
            throw new Error(resolveVideoInfoErrorMessage(error));
        }
    }

}
