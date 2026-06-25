import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import Page from '@/app/page';
import GetVideoInfo from '@/app/usecase/GetVideoInfo';
import DownloadAudio from '@/app/usecase/DownloadAudio';
import VideoInfoResponse from '@/app/domain/model/VideoInfoResponse';
import DownloadAudioResponse from '@/app/domain/model/DownloadAudioResponse';

// ── Tauri mocks ──────────────────────────────────────────────────────────────
jest.mock('@tauri-apps/api/core', () => ({
    invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/path', () => ({
    downloadDir: jest.fn().mockResolvedValue('/Users/test/Downloads'),
}));

jest.mock('@tauri-apps/api/app', () => ({
    getVersion: jest.fn().mockResolvedValue('0.1.0'),
}));

jest.mock('@tauri-apps/api/event', () => ({
    listen: jest.fn(),
}));

jest.mock('@tauri-apps/plugin-deep-link', () => ({
    onOpenUrl: jest.fn(),
}));

jest.mock('@tauri-apps/plugin-clipboard-manager', () => ({
    writeText: jest.fn().mockResolvedValue(undefined),
}));

// ── Use case mocks ───────────────────────────────────────────────────────────
jest.mock('@/app/usecase/GetVideoInfo');
jest.mock('@/app/usecase/DownloadAudio');

// ── UI library mocks ─────────────────────────────────────────────────────────
jest.mock('sonner', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
    Toaster: () => null,
}));

jest.mock('next/link', () => {
    const MockLink = ({
        children,
        href,
        onClick,
    }: {
        children: React.ReactNode;
        href: string;
        onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    }) => (
        <a href={href} onClick={onClick}>
            {children}
        </a>
    );
    MockLink.displayName = 'MockLink';
    return { __esModule: true, default: MockLink };
});

// ── Typed mock helpers ───────────────────────────────────────────────────────
const MockedGetVideoInfo = GetVideoInfo as jest.MockedClass<typeof GetVideoInfo>;
const MockedDownloadAudio = DownloadAudio as jest.MockedClass<typeof DownloadAudio>;
const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockListen = listen as jest.MockedFunction<typeof listen>;
const mockOnOpenUrl = onOpenUrl as jest.MockedFunction<typeof onOpenUrl>;

const TAKE_PENDING_DEEP_LINK_COMMAND = 'take_pending_deep_link';

type DeepLinkEventHandler = (event: { event: string; id: number; payload: string }) => void;

// `useDeepLink` calls `invoke('take_pending_deep_link')` and `listen(...)` on every mount,
// so these must always resolve to keep the rest of the suite (which never touches deep links) working.
let emitDeepLinkEvent: (url: string) => void = () => {};

mockInvoke.mockImplementation((command: string) => {
    if (command === TAKE_PENDING_DEEP_LINK_COMMAND) return Promise.resolve(null);
    return Promise.resolve(undefined);
});

mockListen.mockImplementation((_event, handler) => {
    emitDeepLinkEvent = (url: string) =>
        (handler as DeepLinkEventHandler)({ event: 'deep-link://download', id: 1, payload: url });
    return Promise.resolve(jest.fn());
});

mockOnOpenUrl.mockImplementation(() => Promise.resolve(jest.fn()));

function renderPage() {
    return render(<Page />);
}

describe('Page – initial render', () => {
    it('shows the URL input', () => {
        renderPage();
        expect(screen.getByPlaceholderText('https://youtube.com/watch?v=...')).toBeInTheDocument();
    });

    it('shows the "Analisar vídeo" button', () => {
        renderPage();
        expect(screen.getByText('Analisar vídeo')).toBeInTheDocument();
    });

    it('does not show the music name field initially', () => {
        renderPage();
        expect(screen.queryByPlaceholderText('Nome da música')).not.toBeInTheDocument();
    });
});

describe('Page – URL validation', () => {
    it('shows error for a non-YouTube URL', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: 'https://www.google.com' },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            expect(screen.getByText('A URL não é do YouTube. Verifique se o senhor copiou corretamente.')).toBeInTheDocument();
        });
    });

    it('shows error for a non-YouTube valid URL (e.g. Spotify)', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: 'https://open.spotify.com/track/abc' },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            expect(screen.getByText('A URL não é do YouTube. Verifique se o senhor copiou corretamente.')).toBeInTheDocument();
        });
    });
});

describe('Page – video analysis flow', () => {
    const VALID_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    beforeEach(() => {
        jest.clearAllMocks();
        MockedGetVideoInfo.prototype.execute = jest.fn().mockResolvedValue(
            new VideoInfoResponse('Never Gonna Give You Up', 'Rick Astley')
        );
        MockedDownloadAudio.prototype.execute = jest.fn().mockResolvedValue(
            new DownloadAudioResponse(VALID_URL)
        );
    });

    it('shows music name field after successful video info fetch', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Nome da música')).toBeInTheDocument();
        });
    });

    it('populates the music name field with a sanitized title', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            const musicNameInput = screen.getByPlaceholderText('Nome da música') as HTMLInputElement;
            expect(musicNameInput.value).toContain('.mp3');
        });
    });

    it('shows the "Baixar música" button after analysis', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Baixar música' })).toBeInTheDocument();
        });
    });

    it('disables the URL input after analysis', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            expect(screen.getByPlaceholderText('https://youtube.com/watch?v=...')).toBeDisabled();
        });
    });
});

describe('Page – error handling', () => {
    const VALID_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const { toast } = jest.requireMock('sonner') as { toast: { success: jest.Mock; error: jest.Mock } };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows error toast when GetVideoInfo throws', async () => {
        MockedGetVideoInfo.prototype.execute = jest.fn().mockRejectedValue(
            new Error('Vídeo não encontrado. Verifique se o link está correto.')
        );

        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                'Vídeo não encontrado. Verifique se o link está correto.'
            );
        });
    });

    it('does not show music name field when GetVideoInfo throws', async () => {
        MockedGetVideoInfo.prototype.execute = jest.fn().mockRejectedValue(
            new Error('Erro de rede. Verifique sua conexão e tente novamente.')
        );

        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            expect(screen.queryByPlaceholderText('Nome da música')).not.toBeInTheDocument();
        });
    });

    it('shows error toast when DownloadAudio throws', async () => {
        MockedGetVideoInfo.prototype.execute = jest.fn().mockResolvedValue(
            new VideoInfoResponse('Never Gonna Give You Up', 'Rick Astley')
        );
        MockedDownloadAudio.prototype.execute = jest.fn().mockRejectedValue(
            new Error('Falha ao baixar o vídeo. Ele pode ser privado, restrito ou indisponível.')
        );

        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => expect(screen.getByRole('button', { name: 'Baixar música' })).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: 'Baixar música' }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                'Falha ao baixar o vídeo. Ele pode ser privado, restrito ou indisponível.',
                expect.objectContaining({ description: expect.any(String) })
            );
        });
    });

    it('shows validation error when music name is too short', async () => {
        MockedGetVideoInfo.prototype.execute = jest.fn().mockResolvedValue(
            new VideoInfoResponse('', 'Artist')
        );

        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => expect(screen.getByPlaceholderText('Nome da música')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: 'Baixar música' }));

        await waitFor(() => {
            expect(screen.getByText('O nome da música deve ter pelo menos 5 caracteres.')).toBeInTheDocument();
        });
    });
});

describe('Page – reset', () => {
    const VALID_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    beforeEach(() => {
        jest.clearAllMocks();
        MockedGetVideoInfo.prototype.execute = jest.fn().mockResolvedValue(
            new VideoInfoResponse('Never Gonna Give You Up', 'Rick Astley')
        );
    });

    it('resets the form when "Começar de novo" is clicked', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => expect(screen.getByPlaceholderText('Nome da música')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Começar de novo'));

        await waitFor(() => {
            expect(screen.queryByPlaceholderText('Nome da música')).not.toBeInTheDocument();
            expect(screen.getByText('Analisar vídeo')).toBeInTheDocument();
        });
    });

    it('clears the URL input when resetting', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => expect(screen.getByPlaceholderText('Nome da música')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Começar de novo'));

        await waitFor(() => {
            const urlInput = screen.getByPlaceholderText('https://youtube.com/watch?v=...') as HTMLInputElement;
            expect(urlInput.value).toBe('');
        });
    });
});

describe('Page – deep link orchestration', () => {
    const VALID_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const OTHER_VALID_URL = 'https://www.youtube.com/watch?v=other123456';
    const { toast } = jest.requireMock('sonner') as { toast: { success: jest.Mock; error: jest.Mock } };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('automatically analyzes and downloads after a valid deep link arrives while idle', async () => {
        MockedGetVideoInfo.prototype.execute = jest.fn().mockResolvedValue(
            new VideoInfoResponse('Never Gonna Give You Up', 'Rick Astley')
        );
        MockedDownloadAudio.prototype.execute = jest.fn().mockResolvedValue(
            new DownloadAudioResponse(VALID_URL)
        );

        renderPage();
        await waitFor(() => expect(mockListen).toHaveBeenCalled());

        act(() => emitDeepLinkEvent(VALID_URL));

        await waitFor(() => {
            expect(MockedGetVideoInfo.prototype.execute).toHaveBeenCalledWith(
                expect.objectContaining({ videoUrl: VALID_URL })
            );
        });
        await waitFor(() => {
            expect(MockedDownloadAudio.prototype.execute).toHaveBeenCalledWith(
                expect.objectContaining({ videoUrl: VALID_URL, fileName: 'Never Gonna Give You Up.mp3' })
            );
        });
        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith(
                'Download concluído!',
                expect.objectContaining({
                    description: expect.stringContaining('Never Gonna Give You Up.mp3'),
                })
            );
        });
    });

    it('shows a toast and skips analysis when a deep link arrives during an active download', async () => {
        MockedGetVideoInfo.prototype.execute = jest.fn().mockResolvedValue(
            new VideoInfoResponse('Never Gonna Give You Up', 'Rick Astley')
        );
        MockedDownloadAudio.prototype.execute = jest.fn().mockImplementation(
            () => new Promise<DownloadAudioResponse>(() => {})
        );

        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Baixar música' })).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: 'Baixar música' }));
        await waitFor(() => expect(screen.getByText('Baixando...')).toBeInTheDocument());

        await waitFor(() => expect(mockListen).toHaveBeenCalled());
        act(() => emitDeepLinkEvent(OTHER_VALID_URL));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                'Há um download em andamento. Aguarde a conclusão para iniciar outro.'
            );
        });
        expect(MockedGetVideoInfo.prototype.execute).toHaveBeenCalledTimes(1);
    });

    it('overwrites the form and re-analyzes when a deep link arrives while idle', async () => {
        MockedGetVideoInfo.prototype.execute = jest.fn()
            .mockResolvedValueOnce(new VideoInfoResponse('First Video', 'Author One'))
            .mockResolvedValueOnce(new VideoInfoResponse('Second Video', 'Author Two'));
        MockedDownloadAudio.prototype.execute = jest.fn().mockImplementation(
            () => new Promise<DownloadAudioResponse>(() => {})
        );

        renderPage();

        fireEvent.change(screen.getByPlaceholderText('https://youtube.com/watch?v=...'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Baixar música' })).toBeInTheDocument());

        await waitFor(() => expect(mockListen).toHaveBeenCalled());
        act(() => emitDeepLinkEvent(OTHER_VALID_URL));

        await waitFor(() => {
            const urlInput = screen.getByPlaceholderText('https://youtube.com/watch?v=...') as HTMLInputElement;
            expect(urlInput.value).toBe(OTHER_VALID_URL);
        });
        await waitFor(() => {
            expect(MockedGetVideoInfo.prototype.execute).toHaveBeenLastCalledWith(
                expect.objectContaining({ videoUrl: OTHER_VALID_URL })
            );
        });
        await waitFor(() => {
            expect(MockedDownloadAudio.prototype.execute).toHaveBeenCalledWith(
                expect.objectContaining({ videoUrl: OTHER_VALID_URL, fileName: 'Second Video.mp3' })
            );
        });
    });

    it('shows a toast and skips analysis when an invalid deep link arrives', async () => {
        renderPage();
        await waitFor(() => expect(mockListen).toHaveBeenCalled());

        act(() => emitDeepLinkEvent('https://www.google.com'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('O link recebido não é um vídeo do YouTube válido.');
        });
        expect(MockedGetVideoInfo.prototype.execute).not.toHaveBeenCalled();
        expect(MockedDownloadAudio.prototype.execute).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Analisar vídeo' })).toBeEnabled();
    });
});
