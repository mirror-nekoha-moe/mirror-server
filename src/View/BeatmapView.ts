import { BeatmapRow } from '@Model/BeatmapModel';
import { BeatmapsetRow } from '@Model/BeatmapsetModel';
import { BeatmapsetView } from '@View/BeatmapsetView';
import { toRanked, toNum, toIso } from '@View/Format';

export class BeatmapView {
    // beatmap inside GET /beatmapsets/{id}
    static render(row: BeatmapRow) {
        const beatmap = BeatmapView.renderExtended(row);

        return {
            ...beatmap,
            top_tag_ids: row.top_tag_ids,
            current_user_tag_ids: [],
        };
    }

    // GET /beatmaps/{id} has the set but no tag ids
    static renderWithBeatmapset(row: BeatmapRow, beatmapsetRow: BeatmapsetRow | null) {
        const beatmap = BeatmapView.renderExtended(row);

        let beatmapset = null;
        if (beatmapsetRow) {
            beatmapset = BeatmapsetView.renderExtended(beatmapsetRow);
        }

        return {
            ...beatmap,
            beatmapset,
        };
    }

    static renderExtended(row: BeatmapRow) {
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
            failtimes: row.failtimes,
            owners: row.owners,
            // osu! sends this for guest tokens too
            current_user_playcount: 0,
        };
    }
}

export type BeatmapJson = ReturnType<typeof BeatmapView.renderWithBeatmapset>;