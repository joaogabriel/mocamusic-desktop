"use client"

import Link from "next/link";
import {toast} from "sonner";
import {Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Toaster} from "@/components/ui/sonner"
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {useState} from "react";
import GetVideoInfo from "@/app/usecase/GetVideoInfo";
import VideoInfoRequest from "@/app/domain/model/VideoInfoRequest";
import DownloadAudioRequest from "@/app/domain/model/DownloadAudioRequest";
import DownloadAudio from "@/app/usecase/DownloadAudio";

const downloadVideoSchema = z.object({
    url: z.string().url()
});

type DownloadVideoSchema = z.infer<typeof downloadVideoSchema>;

export default function Page() {

    const defaultMusicExtension = '.mp3';
    const [downloadAvailable, setDownloadAvailable] = useState(false);
    const [videoInfoLoading, setVideoInfoLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [musicName, setMusicName] = useState('');
    const [videoUrl, setVideoUrl] = useState('');

    const {register, handleSubmit} = useForm<DownloadVideoSchema>({
        resolver: zodResolver(downloadVideoSchema),
    });

    async function onSubmit(data: DownloadVideoSchema) {
        console.log('onSubmit')
        console.log(data)
        setVideoInfoLoading(true);
        const getVideoInfo = new GetVideoInfo();
        const response = await getVideoInfo.execute(new VideoInfoRequest(data.url));
        const suggestedMusicName = sanitizeMusicName(response.title);
        setMusicName(suggestedMusicName);
        setVideoUrl(data.url);
        setVideoInfoLoading(false);
        setDownloadAvailable(true);
    }

    async function download() {
        setDownloading(true);
        const outputPath = '/Users/joaogabriel/env-dev/temp/mp3-downloads';
        // const fileName = 'audio.mp3';
        const downloadAudio = new DownloadAudio();
        const downloadAudioRequest = new DownloadAudioRequest(videoUrl, outputPath, musicName);
        const response = await downloadAudio.execute(downloadAudioRequest);
        console.log('response', response)
        setDownloading(false);
        console.log('calling toast');
        toast("O download foi finalizado", {
            action: {
                label: "Abrir pasta",
                onClick: () => console.log("Undo"),
            },
            description: `A música ${musicName} foi salva em ${outputPath}`,
        });
        console.log('toast called');
    }

    const sanitizeMusicName = (musicName: string) => {
        if (!musicName) return '';
        const stringWithoutSpecialChars = musicName.replace(/[^a-zA-Z ]/g, '');
        return stringWithoutSpecialChars.split(' ')
            .filter(str => str.length > 0)
            .map(str => str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase())
            .join(' ')
            .concat(defaultMusicExtension);
    }

    // TODO ajustar classe
    const handleMusicName = (event: any) => {
        console.log(typeof event)
        setMusicName(event.target.value);
    }

    // const onError = (errors, e) => console.log(errors, e);

    return (
        <div className="w-full">
            <Toaster/>
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto grid w-[500px] gap-6">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="grid gap-2 text-center">
                            <h1 className="text-3xl font-bold">Download</h1>
                            <p className="text-balance text-muted-foreground">
                                Insira o link do vídeo para download
                            </p>
                        </div>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="link">Link</Label>
                                <Input
                                    id="link"
                                    type="url"
                                    placeholder="https..."
                                    defaultValue={"https://www.youtube.com/watch?v=I_BBfcIcv0g"}
                                    required
                                    {...register('url')}
                                />
                            </div>
                            {videoInfoLoading &&
                                <Button disabled className="flex justify-center items-center">
                                    <Loader2 className="h-4 animate-spin w-full"/>
                                    Analisando vídeo...
                                </Button>}
                            {!videoInfoLoading &&
                                <div className="flex justify-center items-center">
                                    <Button type="submit" className="w-full">
                                        Analisar vídeo
                                    </Button>
                                </div>
                            }
                            {downloadAvailable &&
                                <div className="grid gap-2">
                                    <Label htmlFor="link">Nome da música</Label>
                                    <Input
                                        id="link"
                                        type="url"
                                        placeholder="Musica.mp3"
                                        value={musicName}
                                        required
                                        onChange={handleMusicName}
                                    />
                                </div>
                            }
                            {downloadAvailable && downloading &&
                                <Button disabled className="flex justify-center items-center">
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                    Baixando música...
                                </Button>
                            }
                            {downloadAvailable && !downloading &&
                                <Button type="button" className="w-full" onClick={() => download()}>
                                    Baixar música
                                </Button>
                            }
                        </div>
                        <div className="mt-4 text-center text-sm">
                            Está dando algum problema?{" "}
                            <Link href="#" className="underline">
                                Tente novamente
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
