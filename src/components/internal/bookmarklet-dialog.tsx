"use client"

import {useState} from "react";
import {toast} from "sonner";
import {Check, Copy} from "lucide-react";
import {writeText} from "@tauri-apps/plugin-clipboard-manager";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {BOOKMARKLET_CODE} from "@/lib/bookmarklet";

const COPY_FEEDBACK_DURATION_MS = 2000;
const BOOKMARKLET_COPY_ERROR_MESSAGE = 'Não foi possível copiar o código. Copie manualmente o texto abaixo.';

export default function BookmarkletDialog() {

    const [copied, setCopied] = useState(false);

    async function copyBookmarkletCode() {
        try {
            await writeText(BOOKMARKLET_CODE);
            setCopied(true);
            setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
        } catch (error) {
            console.error('Falha ao copiar o código do bookmarklet:', error);
            toast.error(BOOKMARKLET_COPY_ERROR_MESSAGE);
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="text-xs text-[#606060] underline-offset-4 transition-colors hover:text-[#0f0f0f] hover:underline">
                    Instalar bookmarklet
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Instalar o bookmarklet</DialogTitle>
                    <DialogDescription>
                        Baixe músicas do YouTube com um clique, direto do navegador.
                    </DialogDescription>
                </DialogHeader>

                <ol className="list-decimal space-y-2 pl-5 text-sm text-[#0f0f0f]">
                    <li>Copie o código abaixo.</li>
                    <li>Na barra de favoritos do navegador, crie um novo favorito (arraste qualquer link para a barra ou use o menu &quot;Adicionar página aos favoritos&quot;).</li>
                    <li>Edite o favorito criado: dê o nome &quot;Moca Music&quot; e cole o código copiado no campo de URL/Endereço.</li>
                    <li>Salve. Em qualquer vídeo do YouTube, clique nesse favorito para baixar o áudio automaticamente.</li>
                </ol>

                <div className="flex items-center gap-2 rounded-md border border-[#e5e5e5] bg-[#f9f9f9] p-3">
                    <code className="flex-1 overflow-x-auto whitespace-nowrap text-xs text-[#0f0f0f]">
                        {BOOKMARKLET_CODE}
                    </code>
                    <Button type="button" size="sm" variant="outline" onClick={copyBookmarkletCode}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copiado" : "Copiar"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
