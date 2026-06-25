import { parseDeepLink } from '@/lib/deep-link';

describe('parseDeepLink', () => {
    it('returns decoded payload for a valid encoded deep link', () => {
        const encodedUrl = encodeURIComponent('https://youtu.be/dQw4w9WgXcQ');

        const result = parseDeepLink(`mocamusic://download?url=${encodedUrl}`);

        expect(result).toEqual({ action: 'download', url: 'https://youtu.be/dQw4w9WgXcQ' });
    });

    it('returns payload for a valid deep link with a non-encoded URL', () => {
        const result = parseDeepLink('mocamusic://download?url=https://youtu.be/dQw4w9WgXcQ');

        expect(result).toEqual({ action: 'download', url: 'https://youtu.be/dQw4w9WgXcQ' });
    });

    it('returns null when the url param is missing', () => {
        const result = parseDeepLink('mocamusic://download');

        expect(result).toBeNull();
    });

    it('returns null when the url param is empty', () => {
        const result = parseDeepLink('mocamusic://download?url=');

        expect(result).toBeNull();
    });

    it('returns null for an unknown action', () => {
        const encodedUrl = encodeURIComponent('https://youtu.be/dQw4w9WgXcQ');

        const result = parseDeepLink(`mocamusic://upload?url=${encodedUrl}`);

        expect(result).toBeNull();
    });

    it('returns null for the wrong scheme', () => {
        const encodedUrl = encodeURIComponent('https://youtu.be/dQw4w9WgXcQ');

        const result = parseDeepLink(`wrongscheme://download?url=${encodedUrl}`);

        expect(result).toBeNull();
    });

    it('returns null for an empty string', () => {
        const result = parseDeepLink('');

        expect(result).toBeNull();
    });

    it('returns null for a malformed string', () => {
        const result = parseDeepLink('not a url');

        expect(result).toBeNull();
    });
});
