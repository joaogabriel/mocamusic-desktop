export default class VideoInfoResponse {
    readonly title: string;
    readonly author: string;

    constructor(title: string, author: string) {
        this.title = title;
        this.author = author;
    }

}
