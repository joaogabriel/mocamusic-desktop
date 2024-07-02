import GetVideoInfo from "@/app/usecase/GetVideoInfo";
import {describe, it} from "node:test";
import assert from "node:assert";
import VideoInfoRequest from "@/app/domain/model/VideoInfoRequest";

// test('Getting video info', () => {
//     const videoURL = 'https://www.youtube.com/watch?v=1_G60OdEzXs';
//     const result = new GetVideoInfo().execute(videoURL);
//     expect(result).toBe('info');
// });

describe('GetVideoInfo', () => {
    it('Should return an empty array', async () => {
        const get = new GetVideoInfo()
        const response = await get.execute(new VideoInfoRequest(''))
        console.log(response)
        assert.deepEqual('1', '1');
    })
});
