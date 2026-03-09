const DEFAULT_MUSIC_EXTENSION = '.mp3';

export function sanitizeMusicName(musicName: string): string {
    if (!musicName) return '';
    const stringWithoutSpecialChars = musicName.replace(/[^a-zA-ZÀ-ÿ ]/g, '');
    return stringWithoutSpecialChars
        .split(' ')
        .filter(str => str.length > 0)
        .map(str => str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase())
        .join(' ')
        .concat(DEFAULT_MUSIC_EXTENSION);
}
