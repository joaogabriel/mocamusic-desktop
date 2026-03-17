import { sanitizeMusicName } from '@/lib/sanitize';

describe('sanitizeMusicName', () => {
    it('returns empty string for empty input', () => {
        expect(sanitizeMusicName('')).toBe('');
    });

    it('capitalizes first letter of each word and lowercases the rest', () => {
        expect(sanitizeMusicName('hello world')).toBe('Hello World.mp3');
    });

    it('appends .mp3 extension', () => {
        const result = sanitizeMusicName('song');
        expect(result.endsWith('.mp3')).toBe(true);
    });

    it('removes special characters', () => {
        expect(sanitizeMusicName('song! @#$%')).toBe('Song.mp3');
    });

    it('handles multiple consecutive spaces', () => {
        expect(sanitizeMusicName('hello   world')).toBe('Hello World.mp3');
    });

    it('lowercases uppercase input', () => {
        expect(sanitizeMusicName('NEVER GONNA GIVE YOU UP')).toBe(
            'Never Gonna Give You Up.mp3'
        );
    });

    it('handles mixed case', () => {
        expect(sanitizeMusicName('rICK aSTLEY')).toBe('Rick Astley.mp3');
    });

    it('preserves accented characters', () => {
        const result = sanitizeMusicName('música brasileira');
        expect(result).toBe('Música Brasileira.mp3');
    });

    it('removes numbers from the name', () => {
        const result = sanitizeMusicName('song 123 title');
        expect(result).toBe('Song Title.mp3');
    });

    it('handles single word input', () => {
        expect(sanitizeMusicName('music')).toBe('Music.mp3');
    });
});
