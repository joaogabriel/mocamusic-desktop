import { z } from "zod";

export const youtubeRegex = new RegExp(
    '^(https?://)?((www.)?youtube.com/watch\\?v=.+|youtu.be/.+)'
);

export const downloadVideoSchema = z.object({
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

export type DownloadVideoSchema = z.infer<typeof downloadVideoSchema>;
