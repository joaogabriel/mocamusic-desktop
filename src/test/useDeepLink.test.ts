import { renderHook, waitFor } from '@testing-library/react';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { useDeepLink } from '@/hooks/useDeepLink';
import { logInfo } from '@/components/internal/observability-provider';

jest.mock('@tauri-apps/api/core', () => ({
    invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
    listen: jest.fn(),
}));

jest.mock('@tauri-apps/plugin-deep-link', () => ({
    onOpenUrl: jest.fn(),
}));

jest.mock('@/components/internal/observability-provider', () => ({
    logInfo: jest.fn(),
}));

type EventHandler = (event: { event: string; id: number; payload: string }) => void;
type OpenUrlHandler = (urls: string[]) => void;

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockListen = listen as jest.MockedFunction<typeof listen>;
const mockOnOpenUrl = onOpenUrl as jest.MockedFunction<typeof onOpenUrl>;
const mockLogInfo = logInfo as jest.MockedFunction<typeof logInfo>;

describe('useDeepLink', () => {
    const unlistenEvent: jest.MockedFunction<UnlistenFn> = jest.fn();
    const unlistenOpenUrl: jest.MockedFunction<UnlistenFn> = jest.fn();
    let emitEvent: EventHandler = () => {};
    let emitOpenUrl: OpenUrlHandler = () => {};

    beforeEach(() => {
        jest.clearAllMocks();
        mockInvoke.mockResolvedValue(null);
        mockListen.mockImplementation((_event, handler) => {
            emitEvent = handler as unknown as EventHandler;
            return Promise.resolve(unlistenEvent);
        });
        mockOnOpenUrl.mockImplementation((handler) => {
            emitOpenUrl = handler;
            return Promise.resolve(unlistenOpenUrl);
        });
    });

    it('drains the pending buffer on mount and calls onDownloadRequested', async () => {
        mockInvoke.mockResolvedValue('https://youtu.be/cold-start');
        const onDownloadRequested = jest.fn();

        renderHook(() => useDeepLink({ onDownloadRequested }));

        await waitFor(() => expect(onDownloadRequested).toHaveBeenCalledWith('https://youtu.be/cold-start'));
        expect(mockInvoke).toHaveBeenCalledWith('take_pending_deep_link');
        expect(onDownloadRequested).toHaveBeenCalledTimes(1);
    });

    it('does not call onDownloadRequested when the buffer is empty', async () => {
        const onDownloadRequested = jest.fn();

        renderHook(() => useDeepLink({ onDownloadRequested }));

        await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('take_pending_deep_link'));
        expect(onDownloadRequested).not.toHaveBeenCalled();
    });

    it('calls onDownloadRequested when the deep-link://download event fires', async () => {
        const onDownloadRequested = jest.fn();

        renderHook(() => useDeepLink({ onDownloadRequested }));
        await waitFor(() => expect(mockListen).toHaveBeenCalledWith('deep-link://download', expect.any(Function)));

        emitEvent({ event: 'deep-link://download', id: 1, payload: 'https://youtu.be/runtime' });

        expect(onDownloadRequested).toHaveBeenCalledWith('https://youtu.be/runtime');
    });

    it('ignores a repeated identical payload from the runtime event (dedupe)', async () => {
        const onDownloadRequested = jest.fn();

        renderHook(() => useDeepLink({ onDownloadRequested }));
        await waitFor(() => expect(mockListen).toHaveBeenCalled());

        emitEvent({ event: 'deep-link://download', id: 1, payload: 'https://youtu.be/repeat' });
        emitEvent({ event: 'deep-link://download', id: 2, payload: 'https://youtu.be/repeat' });

        expect(onDownloadRequested).toHaveBeenCalledTimes(1);
    });

    it('forwards a payload parsed from the plugin onOpenUrl channel', async () => {
        const onDownloadRequested = jest.fn();

        renderHook(() => useDeepLink({ onDownloadRequested }));
        await waitFor(() => expect(mockOnOpenUrl).toHaveBeenCalled());

        emitOpenUrl([`mocamusic://download?url=${encodeURIComponent('https://youtu.be/open-url')}`]);

        expect(onDownloadRequested).toHaveBeenCalledWith('https://youtu.be/open-url');
    });

    it('ignores a malformed URL received via onOpenUrl', async () => {
        const onDownloadRequested = jest.fn();

        renderHook(() => useDeepLink({ onDownloadRequested }));
        await waitFor(() => expect(mockOnOpenUrl).toHaveBeenCalled());

        emitOpenUrl(['not-a-deep-link']);

        expect(onDownloadRequested).not.toHaveBeenCalled();
    });

    it('deduplicates a payload delivered through both the custom event and onOpenUrl', async () => {
        const onDownloadRequested = jest.fn();

        renderHook(() => useDeepLink({ onDownloadRequested }));
        await waitFor(() => expect(mockOnOpenUrl).toHaveBeenCalled());

        emitEvent({ event: 'deep-link://download', id: 1, payload: 'https://youtu.be/dual-channel' });
        emitOpenUrl([`mocamusic://download?url=${encodeURIComponent('https://youtu.be/dual-channel')}`]);

        expect(onDownloadRequested).toHaveBeenCalledTimes(1);
    });

    it('logs deep_link_received when a payload is processed', async () => {
        const onDownloadRequested = jest.fn();

        renderHook(() => useDeepLink({ onDownloadRequested }));
        await waitFor(() => expect(mockListen).toHaveBeenCalled());

        emitEvent({ event: 'deep-link://download', id: 1, payload: 'https://youtu.be/logged' });

        expect(mockLogInfo).toHaveBeenCalledWith('deep_link_received', { url: 'https://youtu.be/logged' });
    });

    it('removes both listeners on unmount', async () => {
        const onDownloadRequested = jest.fn();

        const { unmount } = renderHook(() => useDeepLink({ onDownloadRequested }));
        await waitFor(() => expect(mockListen).toHaveBeenCalled());
        await waitFor(() => expect(mockOnOpenUrl).toHaveBeenCalled());

        unmount();
        await waitFor(() => expect(unlistenEvent).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(unlistenOpenUrl).toHaveBeenCalledTimes(1));
    });
});
