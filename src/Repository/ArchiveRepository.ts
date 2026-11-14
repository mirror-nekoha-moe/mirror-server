import { Database } from '@Core/Database/Connection';
import { Environment } from '@Bootstrap/Environment';
import { ArchiveRow } from '@Model/ArchiveModel';

const ARCHIVE_COLUMNS = `
    to_char(archive_date, 'YYYY-MM') AS month,
    mode,
    file_name,
    size_gb,
    beatmapset_count,
    created_at
`;

export class ArchiveRepository {
    static async getAll(): Promise<ArchiveRow[]> {
        const res = await Database.query<ArchiveRow>(`
            SELECT ${ARCHIVE_COLUMNS}
            FROM ${Environment.env.TABLE_ARCHIVE}
            ORDER BY archive_date DESC, mode ASC
        `);
        return res.rows;
    }

    static async getByMonth(month: string, mode: string): Promise<ArchiveRow | null> {
        const res = await Database.query<ArchiveRow>(`
            SELECT ${ARCHIVE_COLUMNS}
            FROM ${Environment.env.TABLE_ARCHIVE}
            WHERE archive_date = $1
                AND mode = $2
        `, [`${month}-01`, mode]);
        return res.rows[0] ?? null;
    }
}