"use client"

import Link from "next/link"

import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {useState} from "react";
import GetVideoInfo from "@/app/usecase/GetVideoInfo";

const downloadVideoSchema = z.object({
    url: z.string().url()
});

type DownloadVideoSchema = z.infer<typeof downloadVideoSchema>;

export default function Page() {

    const [downloadAvailable, setDownloadAvailable] = useState(false);

    const {register, handleSubmit} = useForm<DownloadVideoSchema>({
        resolver: zodResolver(downloadVideoSchema),
    });

    async function onSubmit(data: DownloadVideoSchema) {
        console.log('onSubmit')
        console.log(data)
        setDownloadAvailable(true);
        const getVideoInfo = new GetVideoInfo();
        const response = await getVideoInfo.getVideoInfo(data.url);
        const response2 = await getVideoInfo.download(data.url);
        console.log('response', response, response2)
    }

    // const onError = (errors, e) => console.log(errors, e);

    return (
        <div className="w-full">
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto grid w-[350px] gap-6">
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
                            <Button type="submit" className="w-full">
                                Analisar vídeo
                            </Button>
                            {downloadAvailable &&
                                <Button type="button" className="w-full">
                                    Analisar vídeo outro
                                </Button>}
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
