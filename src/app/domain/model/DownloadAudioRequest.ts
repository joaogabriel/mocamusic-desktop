export default class DownloadAudioRequest {
    readonly videoUrl: string;
    readonly outputPath: string;
    readonly fileName: string;

    constructor(videoUrl: string, outputPath: string, fileName: string) {
        this.videoUrl = videoUrl;
        this.outputPath = outputPath;
        this.fileName = fileName;
    }

}
