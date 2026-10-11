/**
 * @jest-environment node
 */
import { invoke } from '@tauri-apps/api/core';
import DownloadAudio from '@/app/usecase/DownloadAudio';
import DownloadAudioRequest from '@/app/domain/model/DownloadAudioRequest';
import DownloadAudioResponse from '@/app/domain/model/DownloadAudioResponse';

jest.mock('@tauri-apps/api/core', () => ({
    invoke: jest.fn(),
}));

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('DownloadAudio', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockInvoke.mockResolvedValue(undefined);
    });

    it('calls download_audio_as_mp3 with extracted videoId', async () => {
        const request = new DownloadAudioRequest(
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            '/Downloads',
            'Rick Astley.mp3'
        );

        await new DownloadAudio().execute(request);

        expect(mockInvoke).toHaveBeenCalledWith('download_audio_as_mp3', {
            videoId: 'dQw4w9WgXcQ',
            outputPath: '/Downloads',
            fileName: 'Rick Astley.mp3',
        });
    });

    it('extracts video ID from youtu.be short URL', async () => {
        const request = new DownloadAudioRequest(
            'https://youtu.be/dQw4w9WgXcQ',
            '/Downloads',
            'song.mp3'
        );

        await new DownloadAudio().execute(request);

        expect(mockInvoke).toHaveBeenCalledWith(
            'download_audio_as_mp3',
            expect.objectContaining({ videoId: 'dQw4w9WgXcQ' })
        );
    });

    it('returns DownloadAudioResponse with the original videoUrl', async () => {
        const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        const request = new DownloadAudioRequest(videoUrl, '/Downloads', 'song.mp3');

        const response = await new DownloadAudio().execute(request);

        expect(response).toBeInstanceOf(DownloadAudioResponse);
        expect(response.videoUrl).toBe(videoUrl);
    });

    it('calls invoke exactly once', async () => {
        const request = new DownloadAudioRequest(
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            '/Downloads',
            'song.mp3'
        );

        await new DownloadAudio().execute(request);

        expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    describe('when invoke rejects', () => {
        const request = new DownloadAudioRequest(
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            '/Downloads',
            'song.mp3'
        );

        beforeEach(() => {
            jest.spyOn(console, 'error').mockImplementation(() => undefined);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('throws the raw backend message when the rejection is a string', async () => {
            mockInvoke.mockRejectedValue('yt-dlp falhou: video is private');

            await expect(new DownloadAudio().execute(request)).rejects.toThrow('yt-dlp falhou: video is private');
        });

        it('throws the error message when the rejection is an Error', async () => {
            mockInvoke.mockRejectedValue(new Error('sidecar not found'));

            await expect(new DownloadAudio().execute(request)).rejects.toThrow('sidecar not found');
        });

        it('throws the stringified value when the rejection is neither string nor Error', async () => {
            mockInvoke.mockRejectedValue(42);

            await expect(new DownloadAudio().execute(request)).rejects.toThrow('42');
        });
    });
});
