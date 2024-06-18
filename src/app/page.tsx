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
import React, {useState} from "react";
import GetVideoInfo from "@/app/usecase/GetVideoInfo";
import VideoInfoRequest from "@/app/domain/model/VideoInfoRequest";
import DownloadAudioRequest from "@/app/domain/model/DownloadAudioRequest";
import DownloadAudio from "@/app/usecase/DownloadAudio";
import {invokeTauriCommand} from "@tauri-apps/api/helpers/tauri";
import ClipboardInspect from "@/components/internal/clipboard-inspect";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";

const youtubeRegex = new RegExp('^(https?://)?((www.)?youtube.com/watch\\?v=.+|youtu.be/.+)');

const downloadVideoSchema = z.object({
    // url: z.string().url()
    url: z.string()
        .min(3, {
            message: "URL muito pequena"
        })
        .url({
            message: 'Deve ser uma URL válida'
        })
        .regex(youtubeRegex, 'Deve ser uma URL do YouTube'),
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

    const {register, handleSubmit, reset} = useForm<DownloadVideoSchema>({
        resolver: zodResolver(downloadVideoSchema),
    });

    const form = useForm<z.infer<typeof downloadVideoSchema>>({
        resolver: zodResolver(downloadVideoSchema),
        defaultValues: {
            // url: 'https://www.google.com/',
            url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
            musicName: ''
        },
    })

    const updateVideoUrl = async (url: string) => {
        console.log('updateVideoUrl', url)
        setVideoUrl(url);
        await onSubmit({
            url: url,
            musicName: ''
        });
    }

    async function onSubmit(data: DownloadVideoSchema) {
        console.log('onSubmit')
        // TODO exemplo de validacao manual do form
        form.setError('musicName', {
            message: 'erro manual'
        })
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
        const outputPath = '/Users/joaogabriel/env-dev/temp/mp3-downloads';
        const downloadAudio = new DownloadAudio();
        const downloadAudioRequest = new DownloadAudioRequest(videoUrl, outputPath, musicName);
        const response = await downloadAudio.execute(downloadAudioRequest);
        console.log('response', response)
        setDownloading(false);
        console.log('calling toast');
        openToast(outputPath + '/' + musicName);
        console.log('toast called');
    }

    function sanitizeMusicName(musicName: string) {
        if (!musicName) return '';
        const stringWithoutSpecialChars = musicName.replace(/[^a-zA-Z ]/g, '');
        return stringWithoutSpecialChars.split(' ')
            .filter(str => str.length > 0)
            .map(str => str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase())
            .join(' ')
            .concat(defaultMusicExtension);
    }

    function handleMusicName(event: React.ChangeEvent<HTMLInputElement>) {
        console.log(typeof event, event.constructor.name, event.target.value)
        setMusicName(event.target.value);
    }

    function resetFormState() {
        reset();
        setDownloadAvailable(false);
        setVideoUrl('');
        setMusicName('');
    }

    // TODO refatorar
    async function openFileInNativeFileExplorer(
        defaultPath: string
    ): Promise<null | string | string[]> {
        const options = {
            defaultPath
        }
        let res = invokeTauriCommand({
            __tauriModule: 'Dialog',
            message: {
                cmd: 'openDialog',
                options
            }
        })

        return res as any;
    }

    // const onError = (errors, e) => console.log(errors, e);

    return (
        <div className="w-full">
            <Toaster/>
            <ClipboardInspect updateVideoUrl={updateVideoUrl}></ClipboardInspect>
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto grid w-[500px] gap-6">
                    {/*<form onSubmit={handleSubmit(onSubmit)}>*/}
                    {/*    <div className="grid gap-2 text-center">*/}
                    {/*        <h1 className="text-3xl font-bold">Download</h1>*/}
                    {/*        <p className="text-balance text-muted-foreground">*/}
                    {/*            Insira o link do vídeo para download*/}
                    {/*        </p>*/}
                    {/*    </div>*/}
                    {/*    <div className="grid gap-4">*/}
                    {/*        <div className="grid gap-2">*/}
                    {/*            <Label htmlFor="link">Link</Label>*/}
                    {/*            <Input*/}
                    {/*                id="link"*/}
                    {/*                type="url"*/}
                    {/*                placeholder="https..."*/}
                    {/*                defaultValue={"https://www.google.com/"}*/}
                    {/*                disabled={downloadAvailable}*/}
                    {/*                required*/}
                    {/*                {...register('url')}*/}
                    {/*            />*/}
                    {/*        </div>*/}
                    {/*        {videoInfoLoading &&*/}
                    {/*            <Button disabled className="flex justify-center items-center">*/}
                    {/*                <Loader2 className="h-4 animate-spin"/>*/}
                    {/*                Analisando vídeo...*/}
                    {/*            </Button>}*/}
                    {/*        {!videoInfoLoading && !downloadAvailable &&*/}
                    {/*            <div className="flex justify-center items-center">*/}
                    {/*                <Button type="submit" className="w-full">*/}
                    {/*                    Analisar vídeo*/}
                    {/*                </Button>*/}
                    {/*            </div>*/}
                    {/*        }*/}
                    {/*        {downloadAvailable &&*/}
                    {/*            <div className="grid gap-2">*/}
                    {/*                <Label htmlFor="link">Nome da música</Label>*/}
                    {/*                <Input*/}
                    {/*                    id="link"*/}
                    {/*                    type="url"*/}
                    {/*                    placeholder="Musica.mp3"*/}
                    {/*                    value={musicName}*/}
                    {/*                    required*/}
                    {/*                    onChange={handleMusicName}*/}
                    {/*                />*/}
                    {/*            </div>*/}
                    {/*        }*/}
                    {/*        {downloadAvailable && downloading &&*/}
                    {/*            <Button disabled className="flex justify-center items-center">*/}
                    {/*                <Loader2 className="h-4 w-4 animate-spin"/>*/}
                    {/*                Baixando música...*/}
                    {/*            </Button>*/}
                    {/*        }*/}
                    {/*        {downloadAvailable && !downloading &&*/}
                    {/*            <Button type="button" className="w-full" onClick={() => download()}>*/}
                    {/*                Baixar música*/}
                    {/*            </Button>*/}
                    {/*        }*/}
                    {/*    </div>*/}
                    {/*    <div className="mt-4 text-center text-sm">*/}
                    {/*        Quer começar de novo ou baixar outra música?{" "}*/}
                    {/*        <Link href="#" className="underline" onClick={() => resetFormState()}>*/}
                    {/*            Clique aqui*/}
                    {/*        </Link>*/}
                    {/*    </div>*/}
                    {/*</form>*/}
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
                                                    placeholder="https..."
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
                                <div className="mt-4 text-center text-sm">
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
