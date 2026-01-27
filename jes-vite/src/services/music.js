const cleanTitle = (str) => {
    if (!str) return "";
    let cleaned = str;

    // Handle "Label: Title" or "Label presents Title"
    if (str.includes(':')) {
        const parts = str.split(':');
        // If first part is a label or too short, target the second part
        if (parts[0].toLowerCase().includes('records') ||
            parts[0].toLowerCase().includes('fania') ||
            parts[0].length < 12) {
            cleaned = parts.slice(1).join(':');
        } else {
            cleaned = parts[0];
        }
    } else if (str.toLowerCase().includes(' presents ')) {
        cleaned = str.split(/ presents /i)[1];
    }

    return cleaned
        .replace(/Collection 1964-1978/gi, '')
        .replace(/Singles Collection/gi, '')
        .replace(/The Latin Sound of New York/gi, 'Latin Sound New York')
        .replace(/\(SI NO COMPRA ESTE LP\)/gi, '')
        .replace(/\(Remastered.*?\)/gi, '')
        .replace(/\(Deluxe.*?\)/gi, '')
        .replace(/\(Live.*?\)/gi, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/- Single/gi, '')
        .replace(/- EP/gi, '')
        .replace(/vol\.\s*\d+/gi, '')
        .replace(/version/gi, '')
        .replace(/records/gi, '')
        .trim();
};

const cleanArtist = (str) => {
    if (!str) return "";
    return str
        .replace(/Fania Records/gi, 'Fania')
        .replace(/feat\..*/i, '')
        .replace(/&.*/, '')
        .replace(/presents/i, '')
        .replace(/records/i, '')
        .trim();
};

// CORS Proxy to bypass Deezer's CORS restrictions
const CORS_PROXY = 'https://corsproxy.io/?';

// Format Deezer track to our internal format
const formatDeezerTrack = (track) => ({
    trackName: track.title || track.title_short,
    artistName: track.artist?.name || "Unknown Artist",
    collectionName: track.album?.title || "",
    artworkUrl: track.album?.cover_xl || track.album?.cover_big || track.album?.cover_medium || track.album?.cover,
    previewUrl: track.preview,
    collectionId: track.album?.id,
    duration: track.duration
});

export async function getTrackPreview(title, artist = "") {
    try {
        const cleanedTitle = cleanTitle(title);
        const isPlaceholder = !artist ||
            artist.toLowerCase().includes('jes store') ||
            artist.toLowerCase().includes('vinilo') ||
            artist.toLowerCase().includes('disco') ||
            artist.toLowerCase().includes('album');

        const cleanedArtist = isPlaceholder ? "" : cleanArtist(artist);
        console.log(`🎵 Searching Deezer: Title="${cleanedTitle}" Artist="${cleanedArtist}"`);

        // Strategies priorities
        const queries = [
            cleanedArtist ? `${cleanedTitle} ${cleanedArtist}` : null,
            cleanedTitle,
            cleanedTitle.split(' ').slice(0, 3).join(' '), // First 3 words
            cleanedTitle.split(' ').slice(0, 2).join(' ')  // First 2 words (desperate)
        ].filter(Boolean);

        let primaryTrack = null;
        let data = null;

        for (const q of queries) {
            console.log(`🔍 Query: "${q}"`);
            const apiUrl = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=10`;
            const response = await fetch(CORS_PROXY + encodeURIComponent(apiUrl));
            data = await response.json();

            if (data.data && data.data.length > 0) {
                // Try to find exact title match in results
                primaryTrack = data.data.find(t =>
                    t.title.toLowerCase().includes(cleanedTitle.toLowerCase()) ||
                    cleanedTitle.toLowerCase().includes(t.title.toLowerCase())
                ) || data.data[0];
                console.log(`✅ Success with query "${q}": Found "${primaryTrack.title}" by ${primaryTrack.artist?.name}`);
                break;
            }
        }

        if (!primaryTrack) {
            console.warn("❌ No track found on Deezer");
            return null;
        }

        const albumId = primaryTrack.album?.id;
        let tracklist = [];

        if (albumId) {
            try {
                const albumApi = `https://api.deezer.com/album/${albumId}`;
                const albumResponse = await fetch(CORS_PROXY + encodeURIComponent(albumApi));
                const albumData = await albumResponse.json();
                if (albumData.tracks && albumData.tracks.data) {
                    tracklist = albumData.tracks.data.map(track => ({
                        ...formatDeezerTrack(track),
                        collectionName: albumData.title,
                        artworkUrl: albumData.cover_xl || albumData.cover_big
                    }));
                }
            } catch (error) {
                console.warn("⚠️ Album fetch failed");
            }
        }

        return {
            ...formatDeezerTrack(primaryTrack),
            tracklist: tracklist
        };
    } catch (error) {
        console.error("❌ Deezer API Error:", error);
        return null;
    }
}

export async function getLyrics(artist, title) {
    try {
        const cleanedTitle = cleanTitle(title);
        const cleanedArtist = cleanArtist(artist);

        const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanedArtist)}/${encodeURIComponent(cleanedTitle)}`);
        const data = await response.json();
        return data.lyrics || null;
    } catch (error) {
        console.warn("⚠️ Lyrics not found");
        return null;
    }
}
