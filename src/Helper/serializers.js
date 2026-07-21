import { toRanked, toNum, toIso, toGenre, toLanguage } from './helpers.js'

export function serializeBeatmap(row) {
    return {
        beatmapset_id: toNum(row.beatmapset_id),
        difficulty_rating: toNum(row.difficulty_rating),
        id: toNum(row.id),
        lazer_only: row.lazer_only,
        mode: row.mode,
        status: row.status,
        total_length: toNum(row.total_length),
        user_id: toNum(row.user_id),
        version: row.version,
        accuracy: toNum(row.accuracy),
        ar: toNum(row.ar),
        bpm: toNum(row.bpm),
        convert: row.convert,
        count_circles: toNum(row.count_circles),
        count_sliders: toNum(row.count_sliders),
        count_spinners: toNum(row.count_spinners),
        cs: toNum(row.cs),
        deleted_at: toIso(row.deleted_at),
        drain: toNum(row.drain),
        hit_length: toNum(row.hit_length),
        is_scoreable: row.is_scoreable,
        last_updated: toIso(row.last_updated),
        mode_int: toNum(row.mode_int),
        passcount: toNum(row.passcount),
        playcount: toNum(row.playcount),
        ranked: toRanked(row.status),
        url: row.url,
        checksum: row.checksum,
        max_combo: toNum(row.max_combo),
        // TODO?
        // current_user_playcount
        // current_user_tag_ids
        // owners
        // top_tag_ids
    };
}

export function serializeBeatmapset(row, beatmapRows = []) {
    return {
        anime_cover: row.anime_cover,
        artist: row.artist,
        artist_unicode: row.artist_unicode,
        bpm: toNum(row.bpm),
        creator: row.creator,
        deleted_at: toIso(row.deleted_at),
        description: {
            description: row.description,
        },
        favourite_count: toNum(row.favourite_count),
        genre_id: toNum(row.genre_id),
        genre: toGenre(row.genre_id),
        id: toNum(row.id),
        is_scoreable: row.is_scoreable,
        language_id: toNum(row.language_id),
        language: toLanguage(row.language_id),
        last_updated: toIso(row.last_updated),
        more_information: row.more_information,
        nsfw: row.nsfw,
        offset: toNum(row.offset),
        play_count: toNum(row.playcount),
        preview_url: row.preview_url,
        ranked: toRanked(row.status),
        ranked_date: toIso(row.ranked_date),
        rating: toNum(row.rating),
        source: row.source,
        spotlight: row.spotlight,
        status: row.status,
        storyboard: row.storyboard,
        submitted_date: toIso(row.submitted_date),
        tags: row.tags,
        title: row.title,
        title_unicode: row.title_unicode,
        user_id: toNum(row.user_id),
        video: row.video,

        covers: {
            cover: row.cover,
            'cover@2x': row.cover_2x,
            card: row.card,
            'card@2x': row.card_2x,
            list: row.list,
            'list@2x': row.list_2x,
            slimcover: row.slimcover,
            'slimcover@2x': row.slimcover_2x,
        },

        availability: {
            // download_disabled: row.download_disabled,
            more_information: row.more_information,
        },

        beatmaps: beatmapRows.map(serializeBeatmap),

        mirror: {
            beatmap_count: toNum(row.beatmap_count),
            downloaded: row.downloaded,
            download_disabled: row.download_disabled,
            file_size: toNum(row.file_size),
            mode_osu_count: toNum(row.mode_osu_count),
            mode_taiko_count: toNum(row.mode_taiko_count),
            mode_fruits_count: toNum(row.mode_fruits_count),
            mode_mania_count: toNum(row.mode_mania_count),
        },
    };
}
