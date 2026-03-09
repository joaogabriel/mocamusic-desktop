/**
 * @jest-environment node
 */
import { invoke } from '@tauri-apps/api/core';
import GetVideoInfo from '@/app/usecase/GetVideoInfo';
import VideoInfoRequest from '@/app/domain/model/VideoInfoRequest';
import VideoInfoResponse from '@/app/domain/model/VideoInfoResponse';

jest.mock('@tauri-apps/api/core', () => ({
    invoke: jest.fn(),
}));

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('GetVideoInfo', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns video title and author on success', async () => {
        mockInvoke.mockResolvedValue({ title: 'Never Gonna Give You Up', author: 'Rick Astley' });

        const response = await new GetVideoInfo().execute(
            new VideoInfoRequest('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        );

        expect(response).toBeInstanceOf(VideoInfoResponse);
        expect(response.title).toBe('Never Gonna Give You Up');
        expect(response.author).toBe('Rick Astley');
    });

    it('calls fetch_video_info with the correct videoUrl', async () => {
        mockInvoke.mockResolvedValue({ title: 'Test', author: 'Author' });
        const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

        await new GetVideoInfo().execute(new VideoInfoRequest(videoUrl));

        expect(mockInvoke).toHaveBeenCalledWith('fetch_video_info', { videoUrl });
    });

    it('returns empty title and author when invoke throws', async () => {
        mockInvoke.mockRejectedValue(new Error('Tauri backend error'));

        const response = await new GetVideoInfo().execute(
            new VideoInfoRequest('https://www.youtube.com/watch?v=abc')
        );

        expect(response.title).toBe('');
        expect(response.author).toBe('');
    });

    it('calls invoke exactly once', async () => {
        mockInvoke.mockResolvedValue({ title: 'T', author: 'A' });

        await new GetVideoInfo().execute(
            new VideoInfoRequest('https://www.youtube.com/watch?v=abc')
        );

        expect(mockInvoke).toHaveBeenCalledTimes(1);
    });
});
