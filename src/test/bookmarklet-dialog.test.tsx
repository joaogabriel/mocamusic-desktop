import '@testing-library/jest-dom';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {writeText} from '@tauri-apps/plugin-clipboard-manager';
import BookmarkletDialog from '@/components/internal/bookmarklet-dialog';
import {BOOKMARKLET_CODE} from '@/lib/bookmarklet';

jest.mock('@tauri-apps/plugin-clipboard-manager', () => ({
    writeText: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('sonner', () => ({
    toast: {error: jest.fn()},
}));

const mockWriteText = writeText as jest.MockedFunction<typeof writeText>;
const {toast} = jest.requireMock('sonner') as {toast: {error: jest.Mock}};

function openDialog() {
    fireEvent.click(screen.getByText('Instalar bookmarklet'));
}

describe('BookmarkletDialog', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the discreet trigger without showing the dialog content', () => {
        render(<BookmarkletDialog />);

        expect(screen.getByText('Instalar bookmarklet')).toBeInTheDocument();
        expect(screen.queryByText('Instalar o bookmarklet')).not.toBeInTheDocument();
    });

    it('shows the step-by-step instructions after the trigger is clicked', async () => {
        render(<BookmarkletDialog />);

        openDialog();

        await waitFor(() => {
            expect(screen.getByText('Instalar o bookmarklet')).toBeInTheDocument();
        });
        expect(screen.getByText(/Copie o código abaixo/)).toBeInTheDocument();
        expect(screen.getByText(/crie um novo favorito/)).toBeInTheDocument();
        expect(screen.getByText(/clique nesse favorito para baixar o áudio automaticamente/)).toBeInTheDocument();
    });

    it('shows the copyable bookmarklet code', async () => {
        render(<BookmarkletDialog />);

        openDialog();

        await waitFor(() => {
            expect(screen.getByText(BOOKMARKLET_CODE)).toBeInTheDocument();
        });
    });

    it('copies BOOKMARKLET_CODE to the clipboard when the copy button is clicked', async () => {
        render(<BookmarkletDialog />);

        openDialog();
        await waitFor(() => expect(screen.getByRole('button', {name: 'Copiar'})).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', {name: 'Copiar'}));

        await waitFor(() => {
            expect(mockWriteText).toHaveBeenCalledWith(BOOKMARKLET_CODE);
        });
    });

    it('shows copied feedback after the code is copied', async () => {
        render(<BookmarkletDialog />);

        openDialog();
        await waitFor(() => expect(screen.getByRole('button', {name: 'Copiar'})).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', {name: 'Copiar'}));

        await waitFor(() => {
            expect(screen.getByRole('button', {name: 'Copiado'})).toBeInTheDocument();
        });
    });

    it('shows an error toast and keeps the copy button unchanged when the clipboard write fails', async () => {
        mockWriteText.mockRejectedValueOnce(new Error('clipboard unavailable'));
        render(<BookmarkletDialog />);

        openDialog();
        await waitFor(() => expect(screen.getByRole('button', {name: 'Copiar'})).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', {name: 'Copiar'}));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Não foi possível copiar o código. Copie manualmente o texto abaixo.');
        });
        expect(screen.getByRole('button', {name: 'Copiar'})).toBeInTheDocument();
    });
});
