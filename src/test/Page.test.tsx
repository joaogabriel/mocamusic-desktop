import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// ── Use case mocks ───────────────────────────────────────────────────────────
jest.mock('@/app/usecase/GetVideoInfo');
jest.mock('@/app/usecase/DownloadAudio');

// ── UI library mocks ─────────────────────────────────────────────────────────
jest.mock('sonner', () => ({
    toast: { success: jest.fn() },
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

function renderPage() {
    return render(<Page />);
}

describe('Page – initial render', () => {
    it('shows the URL input', () => {
        renderPage();
        expect(screen.getByPlaceholderText('Cole o link do YouTube aqui')).toBeInTheDocument();
    });

    it('shows the "Analisar vídeo" button', () => {
        renderPage();
        expect(screen.getByText('Analisar vídeo')).toBeInTheDocument();
    });

    it('does not show the music name field initially', () => {
        renderPage();
        expect(screen.queryByPlaceholderText('Musica.mp3')).not.toBeInTheDocument();
    });
});

describe('Page – URL validation', () => {
    it('shows error for a non-YouTube URL', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('Cole o link do YouTube aqui'), {
            target: { value: 'https://www.google.com' },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            expect(screen.getByText(/YouTube/)).toBeInTheDocument();
        });
    });

    it('shows error for a non-YouTube valid URL (e.g. Spotify)', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('Cole o link do YouTube aqui'), {
            target: { value: 'https://open.spotify.com/track/abc' },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            expect(screen.getByText(/YouTube/)).toBeInTheDocument();
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

        fireEvent.change(screen.getByPlaceholderText('Cole o link do YouTube aqui'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Musica.mp3')).toBeInTheDocument();
        });
    });

    it('populates the music name field with a sanitized title', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('Cole o link do YouTube aqui'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            const musicNameInput = screen.getByPlaceholderText('Musica.mp3') as HTMLInputElement;
            expect(musicNameInput.value).toContain('.mp3');
        });
    });

    it('shows the "Baixar música" button after analysis', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('Cole o link do YouTube aqui'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            expect(screen.getByText('Baixar música')).toBeInTheDocument();
        });
    });

    it('disables the URL input after analysis', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('Cole o link do YouTube aqui'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Cole o link do YouTube aqui')).toBeDisabled();
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

        fireEvent.change(screen.getByPlaceholderText('Cole o link do YouTube aqui'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => expect(screen.getByPlaceholderText('Musica.mp3')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Começar de novo'));

        await waitFor(() => {
            expect(screen.queryByPlaceholderText('Musica.mp3')).not.toBeInTheDocument();
            expect(screen.getByText('Analisar vídeo')).toBeInTheDocument();
        });
    });

    it('clears the URL input when resetting', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText('Cole o link do YouTube aqui'), {
            target: { value: VALID_URL },
        });
        fireEvent.click(screen.getByText('Analisar vídeo'));

        await waitFor(() => expect(screen.getByPlaceholderText('Musica.mp3')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Começar de novo'));

        await waitFor(() => {
            const urlInput = screen.getByPlaceholderText('Cole o link do YouTube aqui') as HTMLInputElement;
            expect(urlInput.value).toBe('');
        });
    });
});
