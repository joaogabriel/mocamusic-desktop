"use client"

import React, {useEffect, useState} from "react";
import {readText} from "@tauri-apps/api/clipboard";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface ClipboardInspectProps {
    updateVideoUrl: (url: string) => void;
}

export default function ClipboardInspect(props: ClipboardInspectProps) {

    const tauriForegroundEvent = 'tauri://focus';
    const [dialogOpened, setDialogOpened] = useState(false);

    useEffect(() => {
        console.log('ClipboardInspect init');
        setupAppWindow().then(result => console.log('setupAppWindow', result));
    }, []);

    async function setupAppWindow() {
        await (await import('@tauri-apps/api/window')).appWindow.listen(tauriForegroundEvent, () => {
            onWindowFocused();
        });
        // unlisten();
    }

    async function onWindowFocused() {
        console.log('foreground!');
        const clipboardText = await readText();
        if (!clipboardText || isInvalidYouTubeVideoUrl(clipboardText)) {
            return;
        }
        openDialog();
    }

    const openDialog = () => setDialogOpened(true);

    function isValidYouTubeVideoUrl(url: string) {
        const pattern = new RegExp(
            '^(https?://)?((www.)?youtube.com/watch\\?v=.+|youtu.be/.+)'
        );
        return pattern.test(url);
    }

    function isInvalidYouTubeVideoUrl(url: string) {
        return !isValidYouTubeVideoUrl(url);
    }

    async function analyseVideoFromClipboardUrl() {
        const clipboardText = await readText();
        if (!clipboardText) {
            return;
        }
        console.log('clipboardText', clipboardText);
        props.updateVideoUrl(clipboardText);
    }

    return (
        <AlertDialog open={dialogOpened} onOpenChange={setDialogOpened}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Identifiquei que uma URL do YouTube foi copiada!</AlertDialogTitle>
                    <AlertDialogDescription>
                        Deseja analisar o vídeo com esta URL?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Não</AlertDialogCancel>
                    <AlertDialogAction onClick={() => analyseVideoFromClipboardUrl()}>Sim</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )

}
