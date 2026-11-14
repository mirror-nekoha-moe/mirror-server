import { ArchiveRow } from '@Model/ArchiveModel';
import { toIso } from '@View/Format';

export class ArchiveView {
    static render(row: ArchiveRow) {
        const [year, month] = row.month.split('-');

        return {
            month: row.month,
            mode: row.mode,
            file_name: row.file_name,
            size_gb: row.size_gb,
            beatmapset_count: row.beatmapset_count,
            created_at: toIso(row.created_at),
            url: `/api/archive/${year}/${month}/${row.mode}`,
        };
    }
}

export type ArchiveJson = ReturnType<typeof ArchiveView.render>;