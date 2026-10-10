import { BeatmapsetRow } from '@Model/BeatmapsetModel';
import { BeatmapRow } from '@Model/BeatmapModel';
import { BeatmapView } from '@View/BeatmapView';
import { toRanked, toNum, toIso, toGenre, toLanguage } from '@View/Format';

// osu! api v2 shape plus our own mirror block
export class BeatmapsetView {
    static render(row: BeatmapsetRow, beatmapRows: BeatmapRow[] = []) {
        const beatmaps = [];
        for (const beatmapRow of beatmapRows) {
            beatmaps.push(BeatmapView.render(beatmapRow));
        }

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

            beatmaps,

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
}

export type BeatmapsetJson = ReturnType<typeof BeatmapsetView.render>;