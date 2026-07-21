export function toRanked(status) {
    const ranked_map = {
        graveyard: -2,
        wip: -1,
        pending: 0,
        ranked: 1,
        approved: 2,
        qualified: 3,
        loved: 4,
    };
    return status in ranked_map ? ranked_map[status] : null;
}

export function toNum(val) {
    if (val === null || val === undefined) return null;
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
}

export function toIso(val) {
    if (!val) return null;
    return val instanceof Date ? val.toISOString() : new Date(val).toISOString();
}

export function toGenre(genreId) {
    const genre_map = {
        0: 'Any'
        ,1: 'Unspecified'
        ,2: 'Video Game'
        ,3: 'Anime'
        ,4: 'Rock'
        ,5: 'Pop'
        ,6: 'Other'
        ,7: 'Novelty'
        ,9: 'Hip Hop'
        ,10: 'Electronic'
        ,11: 'Metal'
        ,12: 'Classical'
        ,13: 'Folk'
        ,14: 'Jazz'
    };
    const id = toNum(genreId);
    if (id === null) return null;

    return {
        id,
        name: genre_map[id] ?? null
    };
}

export function toLanguage(languageId) {
    const lang_map = {
        0: 'Any'
        ,1: 'Unspecified'
        ,2: 'English'
        ,3: 'Japanese'
        ,4: 'Chinese'
        ,5: 'Instrumental'
        ,6: 'Korean'
        ,7: 'French'
        ,8: 'German'
        ,9: 'Swedish'
        ,10: 'Spanish'
        ,11: 'Italian'
        ,12: 'Russian'
        ,13: 'Polish'
        ,14: 'Other'
    };
    const id = toNum(languageId);
    if (id === null) return null;

    return {
        id,
        name: lang_map[id] ?? null
    };
}