"use client"

import Link from "next/link";
import {toast} from "sonner";
import {Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Toaster} from "@/components/ui/sonner"
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import React, {useState} from "react";
import GetVideoInfo from "@/app/usecase/GetVideoInfo";
import VideoInfoRequest from "@/app/domain/model/VideoInfoRequest";
import DownloadAudioRequest from "@/app/domain/model/DownloadAudioRequest";
import DownloadAudio from "@/app/usecase/DownloadAudio";
import ClipboardInspect from "@/components/internal/clipboard-inspect";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import TauriInvokeGateway from "@/app/gateway/TauriInvokeGateway";

const youtubeRegex = new RegExp('^(https?://)?((www.)?youtube.com/watch\\?v=.+|youtu.be/.+)');

const downloadVideoSchema = z.object({
    url: z.string()
        .min(3, {
            message: "A URL muito pequena. Verifique se o senhor copiou corretamente."
        })
        .url({
            message: 'A URL não é válida. Verifique se o senhor copiou corretamente.'
        })
        .regex(youtubeRegex, 'A URL não é do YouTube. Verifique se o senhor copiou corretamente.'),
    musicName: z.string()
});

type DownloadVideoSchema = z.infer<typeof downloadVideoSchema>;

export default function Page() {

    const defaultMusicExtension = '.mp3';
    const [downloadAvailable, setDownloadAvailable] = useState(false);
    const [videoInfoLoading, setVideoInfoLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [musicName, setMusicName] = useState('');
    const [videoUrl, setVideoUrl] = useState('');

    const form = useForm<z.infer<typeof downloadVideoSchema>>({
        resolver: zodResolver(downloadVideoSchema),
        defaultValues: {
            // url: '',
            // url: 'https://www.google.com/',
            // url: 'https://www.youtube.com/watch?v=nM699RCA2AM',
            // url: 'https://www.youtube.com/watch?v=rTJSWmgbVwA',
            url: 'https://www.youtube.com/watch?v=6RTg7ovfaLk',
            musicName: ''
        },
    });

    const { setValue, reset } = form;

    const updateVideoUrl = async (url: string) => {
        console.log('updateVideoUrl', url)
        setVideoUrl(url);
        setValue('url', url);
        await onSubmit({
            url: url,
            musicName: ''
        });
    }

    async function onSubmit(data: DownloadVideoSchema) {
        console.log('onSubmit')
        console.log(data)
        setVideoInfoLoading(true);
        const getVideoInfo = new GetVideoInfo(new TauriInvokeGateway());
        const response = await getVideoInfo.execute(new VideoInfoRequest(data.url));
        const suggestedMusicName = sanitizeMusicName(response.title);
        console.log(suggestedMusicName)
        setMusicName(suggestedMusicName);
        setValue('musicName', suggestedMusicName);
        setVideoUrl(data.url);
        setVideoInfoLoading(false);
        setDownloadAvailable(true);
    }

    function openToast(musicPath: string) {
        toast.success("O download foi finalizado", {
            action: {
                label: "Abrir pasta",
                onClick: () => openFileInNativeFileExplorer(musicPath),
            },
            description: `A música ${musicName} foi salva em ${musicPath}`,
        });
    }

    async function download() {
        setDownloading(true);
        if (!musicName || musicName.length < 5) {
            form.setError('musicName', {
                message: 'erro manual'
            });
            return;
        }
        // const outputPath = '/Users/joaogabriel/env-dev/temp/mp3-downloads';
        const downloadDirPath = await getDownloadDir();
        const downloadAudio = new DownloadAudio();
        const downloadAudioRequest = new DownloadAudioRequest(videoUrl, downloadDirPath, musicName);
        const response = await downloadAudio.execute(downloadAudioRequest);
        console.log('response', response)
        setDownloading(false);
        console.log('calling toast');
        openToast(downloadDirPath + '/' + musicName);
        console.log('toast called');
    }

    function sanitizeMusicName(musicName: string) {
        if (!musicName) return '';
        const stringWithoutSpecialChars = musicName.replace(/[^a-zA-ZÀ-ÿ ]/g, '');
        return stringWithoutSpecialChars.split(' ')
            .filter(str => str.length > 0)
            .map(str => str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase())
            .join(' ')
            .concat(defaultMusicExtension);
    }

    // function handleMusicName(event: React.ChangeEvent<HTMLInputElement>) {
    //     console.log(typeof event, event.constructor.name, event.target.value)
    //     setMusicName(event.target.value);
    // }

    function resetFormState() {
        reset();
        setDownloadAvailable(false);
        setVideoUrl('');
        setMusicName('');
    }

    async function openFileInNativeFileExplorer(path: string): Promise<void> {
        const tauri = (await import('@tauri-apps/api')).tauri
        await tauri.invoke('show_in_folder', {path});
    }

    async function getDownloadDir() {
        return (await import('@tauri-apps/api/path')).downloadDir();
    }

    // const onError = (errors, e) => console.log(errors, e);

    return (
        <div className="w-full">
            <Toaster/>
            <ClipboardInspect updateVideoUrl={updateVideoUrl}></ClipboardInspect>
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto grid w-[500px] gap-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="grid gap-4">
                                <FormField
                                    control={form.control}
                                    name="url"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Link</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="link"
                                                    type="url"
                                                    placeholder="Cole o link do YouTube aqui"
                                                    disabled={downloadAvailable}
                                                    required
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                                {videoInfoLoading &&
                                    <Button disabled className="flex justify-center items-center">
                                        <Loader2 className="h-4 animate-spin"/>
                                        Analisando vídeo...
                                    </Button>}
                                {!videoInfoLoading && !downloadAvailable &&
                                    <div className="flex justify-center items-center">
                                        <Button type="submit" className="w-full">
                                            Analisar vídeo
                                        </Button>
                                    </div>
                                }
                                {downloadAvailable && (
                                    <FormField
                                        control={form.control}
                                        name="musicName"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Nome da música</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        id="link"
                                                        type="text"
                                                        placeholder="Musica.mp3"
                                                        required
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                )}
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
                                <div className="text-center text-sm">
                                    Quer começar de novo ou baixar outra música?{" "}
                                    <Link href="#" className="underline" onClick={() => resetFormState()}>
                                        Clique aqui
                                    </Link>
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>
        </div>
    )
}
