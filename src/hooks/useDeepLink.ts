'use client';

import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { parseDeepLink } from '@/lib/deep-link';
import { logInfo } from '@/components/internal/observability-provider';

const TAKE_PENDING_DEEP_LINK_COMMAND = 'take_pending_deep_link';
const DEEP_LINK_DOWNLOAD_EVENT = 'deep-link://download';

export interface UseDeepLinkParams {
    onDownloadRequested: (url: string) => void;
}

export function useDeepLink({ onDownloadRequested }: UseDeepLinkParams): void {
    const lastProcessedUrlRef = useRef<string | null>(null);

    useEffect(() => {
        const processUrl = (url: string) => {
            if (lastProcessedUrlRef.current === url) return;
            lastProcessedUrlRef.current = url;
            logInfo('deep_link_received', { url });
            onDownloadRequested(url);
        };

        invoke<string | null>(TAKE_PENDING_DEEP_LINK_COMMAND).then((pendingUrl) => {
            if (pendingUrl) processUrl(pendingUrl);
        });

        const unlistenEventPromise = listen<string>(DEEP_LINK_DOWNLOAD_EVENT, (event) => {
            processUrl(event.payload);
        });

        // The plugin's own `onOpenUrl` channel fires in parallel to the custom Rust event
        // (both stem from the same OS delivery); dedupe above collapses the duplicate.
        // Mitigates the "onOpenUrl re-disparar em remount" risk listed in techspec.md.
        const unlistenOpenUrlPromise = onOpenUrl((urls) => {
            urls.forEach((rawUrl) => {
                const payload = parseDeepLink(rawUrl);
                if (payload) processUrl(payload.url);
            });
        });

        return () => {
            unlistenEventPromise.then((unlisten) => unlisten());
            unlistenOpenUrlPromise.then((unlisten) => unlisten());
        };
    }, [onDownloadRequested]);
}
