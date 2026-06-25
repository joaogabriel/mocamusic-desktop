export const DEEP_LINK_SCHEME = 'mocamusic';
export const DEEP_LINK_ACTION = 'download';
export const DEEP_LINK_URL_PARAM = 'url';

export interface DeepLinkPayload {
    action: typeof DEEP_LINK_ACTION;
    url: string;
}

export function parseDeepLink(uri: string): DeepLinkPayload | null {
    let parsedUri: URL;
    try {
        parsedUri = new URL(uri);
    } catch {
        return null;
    }

    if (parsedUri.protocol !== `${DEEP_LINK_SCHEME}:`) return null;
    if (parsedUri.hostname !== DEEP_LINK_ACTION) return null;

    const url = parsedUri.searchParams.get(DEEP_LINK_URL_PARAM);
    if (!url) return null;

    return { action: DEEP_LINK_ACTION, url };
}
