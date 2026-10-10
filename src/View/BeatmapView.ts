import { BeatmapRow } from '@Model/BeatmapModel';
import { toRanked, toNum, toIso } from '@View/Format';

export class BeatmapView {
    static render(row: BeatmapRow) {
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
}

export type BeatmapJson = ReturnType<typeof BeatmapView.render>;