"use client"

import {toast} from "sonner";
import {Loader2, Music2, Link2, Download} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Toaster} from "@/components/ui/sonner"
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";

import {useState} from "react";
import GetVideoInfo from "@/app/usecase/GetVideoInfo";
import VideoInfoRequest from "@/app/domain/model/VideoInfoRequest";
import DownloadAudioRequest from "@/app/domain/model/DownloadAudioRequest";
import DownloadAudio from "@/app/usecase/DownloadAudio";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import { invoke } from '@tauri-apps/api/core';
import { downloadVideoSchema, type DownloadVideoSchema } from "@/lib/schema";
import { sanitizeMusicName } from "@/lib/sanitize";

import { captureError, logInfo, countMetric } from "@/components/internal/observability-provider";

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
            musicName: ''
        },
    });


    const {setValue, reset} = form;

    const updateVideoUrl = async (url: string) => {
        setVideoUrl(url);
        setValue('url', url);
        await onSubmit({ url, musicName: '' });
    }

    async function onSubmit(data: DownloadVideoSchema) {
        logInfo('onSubmit', {
            version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
            ...data
        });
        setVideoInfoLoading(true);
        try {
            const getVideoInfo = new GetVideoInfo();
            const response = await getVideoInfo.execute(new VideoInfoRequest(data.url));
            const suggestedMusicName = sanitizeMusicName(response.title);
            setMusicName(suggestedMusicName);
            setValue('musicName', suggestedMusicName);
            setVideoUrl(data.url);
            setDownloadAvailable(true);
        } catch (error) {
            console.error('Falha ao analisar vídeo:', error);
            if (error instanceof Error) captureError(error);
            toast.error(error instanceof Error ? error.message : 'Erro ao obter informações do vídeo.');
        } finally {
            setVideoInfoLoading(false);
        }
    }

    function openToast(musicPath: string) {
        toast.success("Download concluído!", {
            action: {
                label: "Abrir pasta",
                onClick: () => openFileInNativeFileExplorer(musicPath),
            },
            description: `${musicName} foi salvo com sucesso.`,
        });
    }

    async function download() {
        if (!musicName || musicName.length < 5) {
            form.setError('musicName', {
                message: 'O nome da música deve ter pelo menos 5 caracteres.'
            });
            return;
        }
        countMetric('download_started');
        setDownloading(true);
        try {
            const downloadDirPath = await getDownloadDir();
            const downloadAudio = new DownloadAudio();
            const downloadAudioRequest = new DownloadAudioRequest(videoUrl, downloadDirPath, musicName);
            const response = await downloadAudio.execute(downloadAudioRequest);
            console.log('response', response)
            countMetric('download_completed');
            openToast(downloadDirPath + '/' + musicName);
            resetFormState();
        } catch (error) {
            console.error('Falha ao baixar o áudio:', error);
            if (error instanceof Error) captureError(error);
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
        countMetric('reset_form');
    }

    async function openFileInNativeFileExplorer(path: string): Promise<void> {
        await invoke('show_in_folder', {path});
    }

    async function getDownloadDir() {
        return (await import('@tauri-apps/api/path')).downloadDir();
    }

    return (
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-[#f9f9f9]">
            <Toaster />

            <div className="w-full max-w-2xl px-8 py-8">

                {/* Hero icon + heading */}
                <div className="mb-10 text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-sm bg-[#ff0000]">
                        <Music2 className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-semibold text-[#0f0f0f]">Baixar música</h2>
                    <p className="mt-2 text-base text-[#606060]">Cole o link do YouTube e baixe em MP3</p>
                </div>

                {/* Step indicators */}
                <div className="mb-6 flex items-center gap-3 px-1">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${!downloadAvailable ? 'bg-[#ff0000] text-white' : 'bg-[#e5e5e5] text-[#606060]'}`}>1</div>
                    <div className="h-px flex-1 bg-[#e5e5e5]" />
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${downloadAvailable ? 'bg-[#ff0000] text-white' : 'bg-[#e5e5e5] text-[#606060]'}`}>2</div>
                </div>

                {/* Form card */}
                <div className="rounded-xl border border-[#e5e5e5] bg-white p-8 shadow-sm">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                            <FormField
                                control={form.control}
                                name="url"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium text-[#0f0f0f]">Link do YouTube</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Link2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#606060]" />
                                                <Input
                                                    id="url"
                                                    type="url"
                                                    placeholder="https://youtube.com/watch?v=..."
                                                    className="h-12 pl-11 text-sm border-[#e5e5e5] bg-white focus-visible:ring-[#ff0000]"
                                                    disabled={downloadAvailable}
                                                    required
                                                    {...field}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {!downloadAvailable && (
                                <Button
                                    type="submit"
                                    className="h-12 w-full bg-[#ff0000] text-sm font-semibold hover:bg-[#cc0000] text-white transition-colors duration-150 border-0 rounded-sm"
                                    disabled={videoInfoLoading}
                                >
                                    {videoInfoLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Analisando vídeo...
                                        </>
                                    ) : 'Analisar vídeo'}
                                </Button>
                            )}

                            {downloadAvailable && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="musicName"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-medium text-[#0f0f0f]">Nome da música</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Music2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#606060]" />
                                                        <Input
                                                            id="musicName"
                                                            type="text"
                                                            placeholder="Nome da música"
                                                            className="h-12 pl-11 text-sm border-[#e5e5e5] bg-white focus-visible:ring-[#ff0000]"
                                                            required
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button
                                        type="button"
                                        className="h-12 w-full bg-[#ff0000] text-sm font-semibold hover:bg-[#cc0000] text-white transition-colors duration-150 border-0 rounded-sm"
                                        onClick={download}
                                        disabled={downloading}
                                    >
                                        {downloading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Baixando...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-2 h-4 w-4" />
                                                Baixar música
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}
                        </form>
                    </Form>
                </div>

                <div className="mt-5 text-center">
                    <button
                        onClick={resetFormState}
                        className="text-xs text-[#606060] underline-offset-4 transition-colors hover:text-[#0f0f0f] hover:underline"
                    >
                        Começar de novo
                    </button>
                </div>

                {/* TODO: remover após validar Sentry */}
                <div className="mt-3 text-center">
                    <button
                        onClick={() => invoke('trigger_test_error')}
                        className="text-xs text-[#aaaaaa] underline-offset-4 transition-colors hover:text-[#606060] hover:underline"
                    >
                        [debug] trigger Sentry error
                    </button>
                </div>
            </div>
        </div>
    )
}
