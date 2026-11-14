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

        const beatmapset = BeatmapsetView.renderExtended(row);

        return {
            ...beatmapset,
            description: {
                description: row.description,
            },
            genre: toGenre(row.genre_id),
            language: toLanguage(row.language_id),
            more_information: row.more_information,
            version_count: toNum(row.version_count),

            beatmaps,
            converts: row.converts,
            current_nominations: row.current_nominations,
            pack_tags: row.pack_tags,
            recent_favourites: row.recent_favourites,
            related_tags: row.related_tags,
            related_users: row.related_users,
            user: row.user,

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

    // what osu! nests in GET /beatmaps/{id}
    static renderExtended(row: BeatmapsetRow) {
        return {
            anime_cover: row.anime_cover,
            artist: row.artist,
            artist_unicode: row.artist_unicode,
            bpm: toNum(row.bpm),
            can_be_hyped: row.can_be_hyped,
            creator: row.creator,
            deleted_at: toIso(row.deleted_at),
            discussion_enabled: row.discussion_enabled,
            discussion_locked: row.discussion_locked,
            favourite_count: toNum(row.favourite_count),
            genre_id: toNum(row.genre_id),
            hype: row.hype,
            id: toNum(row.id),
            is_scoreable: row.is_scoreable,
            language_id: toNum(row.language_id),
            last_updated: toIso(row.last_updated),
            legacy_thread_url: row.legacy_thread_url,
            nominations_summary: row.nominations_summary,
            nsfw: row.nsfw,
            offset: toNum(row.offset),
            play_count: toNum(row.playcount),
            preview_url: row.preview_url,
            ranked: toRanked(row.status),
            ranked_date: toIso(row.ranked_date),
            rating: toNum(row.rating),
            ratings: row.ratings,
            source: row.source,
            spotlight: row.spotlight,
            status: row.status,
            storyboard: row.storyboard,
            submitted_date: toIso(row.submitted_date),
            tags: row.tags,
            title: row.title,
            title_unicode: row.title_unicode,
            track_id: toNum(row.track_id),
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
                download_disabled: row.download_disabled,
                more_information: row.more_information,
            },
        };
    }
}

export type BeatmapsetJson = ReturnType<typeof BeatmapsetView.render>;