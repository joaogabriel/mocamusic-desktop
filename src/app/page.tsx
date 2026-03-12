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
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import { invoke } from '@tauri-apps/api/core';
import { downloadVideoSchema, type DownloadVideoSchema } from "@/lib/schema";
import { sanitizeMusicName } from "@/lib/sanitize";

export default function Page() {

    const [downloadAvailable, setDownloadAvailable] = useState(false);
    const [videoInfoLoading, setVideoInfoLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [musicName, setMusicName] = useState('');
    const [videoUrl, setVideoUrl] = useState('');

    const form = useForm<z.infer<typeof downloadVideoSchema>>({
        resolver: zodResolver(downloadVideoSchema),
        defaultValues: {
            url: '',
            // url: 'https://www.google.com/',
            // url: 'https://www.youtube.com/watch?v=nM699RCA2AM',
            // url: 'https://www.youtube.com/watch?v=rTJSWmgbVwA',
            // url: 'https://www.youtube.com/watch?v=6RTg7ovfaLk',
            musicName: ''
        },
    });

    const {setValue, reset} = form;

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
        try {
            const getVideoInfo = new GetVideoInfo();
            const response = await getVideoInfo.execute(new VideoInfoRequest(data.url));
            const suggestedMusicName = sanitizeMusicName(response.title);
            console.log(suggestedMusicName)
            setMusicName(suggestedMusicName);
            setValue('musicName', suggestedMusicName);
            setVideoUrl(data.url);
            setDownloadAvailable(true);
        } catch (error) {
            console.error('Falha ao analisar vídeo:', error);
            toast.error(error instanceof Error ? error.message : 'Erro ao obter informações do vídeo.');
        } finally {
            setVideoInfoLoading(false);
        }
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
        if (!musicName || musicName.length < 5) {
            form.setError('musicName', {
                message: 'O nome da música deve ter pelo menos 5 caracteres.'
            });
            return;
        }
        setDownloading(true);
        try {
            const downloadDirPath = await getDownloadDir();
            const downloadAudio = new DownloadAudio();
            const downloadAudioRequest = new DownloadAudioRequest(videoUrl, downloadDirPath, musicName);
            const response = await downloadAudio.execute(downloadAudioRequest);
            console.log('response', response)
            openToast(downloadDirPath + '/' + musicName);
            resetFormState();
        } catch (error) {
            console.error('Falha ao baixar o áudio:', error);
            toast.error(error instanceof Error ? error.message : 'Erro ao baixar o vídeo.');
        } finally {
            setDownloading(false);
        }
    }

    function resetFormState() {
        reset();
        setDownloadAvailable(false);
        setVideoUrl('');
        setMusicName('');
    }

    async function openFileInNativeFileExplorer(path: string): Promise<void> {
        await invoke('show_in_folder', {path});
    }

    async function getDownloadDir() {
        return (await import('@tauri-apps/api/path')).downloadDir();
    }

    return (
        <div className="w-full">
            <Toaster/>
            {/*<ClipboardInspect updateVideoUrl={updateVideoUrl}></ClipboardInspect>*/}
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
                                    <Link href="#" className="underline" onClick={() => resetFormState()}>
                                        Começar de novo
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
