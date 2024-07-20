import GetVideoInfo from "@/app/usecase/GetVideoInfo";
import {describe, it, mock} from "node:test";
import assert from "node:assert";
import VideoInfoRequest from "@/app/domain/model/VideoInfoRequest";
import InvokeGateway from "@/app/gateway/InvokeGateway";
import { InvokeArgs } from "@tauri-apps/api/tauri";

class MockGateway implements InvokeGateway {

    invoke<T>(cmd: string, args?: InvokeArgs): Promise<T> {
        return Promise.resolve({
            title: '',
            author: ''
        } as T);
    }

}

describe('GetVideoInfo', () => {
    it('Should return a valid object', async () => {
        const videoURL = 'https://www.youtube.com/watch?v=1_G60OdEzXs';
        const getVideoInfo = new GetVideoInfo(new MockGateway())
        const response = await getVideoInfo.execute(new VideoInfoRequest(videoURL))
        console.log(response)
        assert.deepEqual(response, {
            title: '',
            author: ''
        });
    })
});
