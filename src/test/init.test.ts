import GetVideoInfo from "@/app/usecase/GetVideoInfo";

test('Getting video info', () => {
    const videoURL = 'https://www.youtube.com/watch?v=1_G60OdEzXs';
    const result = new GetVideoInfo().execute(videoURL);
    expect(result).toBe('info');
});
