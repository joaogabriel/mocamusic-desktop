import { downloadVideoSchema, youtubeRegex } from '@/lib/schema';

describe('youtubeRegex', () => {
    it('matches youtube.com/watch?v= URL', () => {
        expect(youtubeRegex.test('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('matches youtu.be short URL', () => {
        expect(youtubeRegex.test('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    it('matches without https', () => {
        expect(youtubeRegex.test('www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('does not match google.com', () => {
        expect(youtubeRegex.test('https://www.google.com')).toBe(false);
    });

    it('does not match random string', () => {
        expect(youtubeRegex.test('not a url')).toBe(false);
    });
});

describe('downloadVideoSchema', () => {
    it('accepts valid YouTube URL', () => {
        const result = downloadVideoSchema.safeParse({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            musicName: '',
        });
        expect(result.success).toBe(true);
    });

    it('accepts youtu.be short URL', () => {
        const result = downloadVideoSchema.safeParse({
            url: 'https://youtu.be/dQw4w9WgXcQ',
            musicName: '',
        });
        expect(result.success).toBe(true);
    });

    it('rejects non-YouTube URL', () => {
        const result = downloadVideoSchema.safeParse({
            url: 'https://www.google.com',
            musicName: '',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const messages = result.error.issues.map(i => i.message).join(' ');
            expect(messages).toMatch(/YouTube/);
        }
    });

    it('rejects invalid URL format', () => {
        const result = downloadVideoSchema.safeParse({
            url: 'not-a-valid-url',
            musicName: '',
        });
        expect(result.success).toBe(false);
    });

    it('rejects string shorter than 3 characters', () => {
        const result = downloadVideoSchema.safeParse({
            url: 'ab',
            musicName: '',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const messages = result.error.issues.map(i => i.message).join(' ');
            expect(messages).toMatch(/pequena/);
        }
    });

    it('accepts any musicName string', () => {
        const result = downloadVideoSchema.safeParse({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            musicName: 'Never Gonna Give You Up',
        });
        expect(result.success).toBe(true);
    });
});
