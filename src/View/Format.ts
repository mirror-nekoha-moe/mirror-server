const RANKED_STATUS: Record<string, number> = {
    graveyard: -2,
    wip: -1,
    pending: 0,
    ranked: 1,
    approved: 2,
    qualified: 3,
    loved: 4,
};

const GENRE_NAMES: Record<number, string> = {
    0: 'Any',
    1: 'Unspecified',
    2: 'Video Game',
    3: 'Anime',
    4: 'Rock',
    5: 'Pop',
    6: 'Other',
    7: 'Novelty',
    9: 'Hip Hop',
    10: 'Electronic',
    11: 'Metal',
    12: 'Classical',
    13: 'Folk',
    14: 'Jazz',
};

const LANGUAGE_NAMES: Record<number, string> = {
    0: 'Any',
    1: 'Unspecified',
    2: 'English',
    3: 'Japanese',
    4: 'Chinese',
    5: 'Instrumental',
    6: 'Korean',
    7: 'French',
    8: 'German',
    9: 'Swedish',
    10: 'Spanish',
    11: 'Italian',
    12: 'Russian',
    13: 'Polish',
    14: 'Other',
};

export interface NamedId {
    id: number;
    name: string | null;
}

export function toRanked(status: string | null): number | null {
    if (status === null) {
        return null;
    }
    if (!Object.hasOwn(RANKED_STATUS, status)) {
        return null;
    }
    return RANKED_STATUS[status];
}

export function toNum(value: unknown): number | null {
    if (value === null || value === undefined) {
        return null;
    }
    const n = Number(value);
    if (Number.isNaN(n)) {
        return null;
    }
    return n;
}

export function toIso(value: Date | string | null): string | null {
    if (!value) {
        return null;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    return new Date(value).toISOString();
}

function toNamedId(value: unknown, names: Record<number, string>): NamedId | null {
    const id = toNum(value);
    if (id === null) {
        return null;
    }
    return {
        id,
        name: names[id] ?? null,
    };
}

export function toGenre(genreId: unknown): NamedId | null {
    return toNamedId(genreId, GENRE_NAMES);
}

export function toLanguage(languageId: unknown): NamedId | null {
    return toNamedId(languageId, LANGUAGE_NAMES);
}