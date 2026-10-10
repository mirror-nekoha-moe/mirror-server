import { Request, Response } from 'express';
import { parseId, sendError } from '@Core/Http/Http';
import { BeatmapsetService } from '@Service/BeatmapsetService';
import { SearchService } from '@Service/SearchService';

export class BeatmapsetController {
    /**
     * @api {get} /api/beatmapset/:id Get beatmapset metadata
     * @apiName beatmapset
     * @apiGroup Beatmapset
     * @apiDescription Returns full metadata for a single beatmapset. Cached in Redis.
     * @apiParam {Number} id Beatmapset ID
     * @apiSuccess {Boolean}  anime_cover             Whether the cover uses anime art style
     * @apiSuccess {String}   artist                  Song artist
     * @apiSuccess {String}   artist_unicode          Song artist (unicode)
     * @apiSuccess {Number}   bpm                     BPM
     * @apiSuccess {String}   creator                 Mapper username
     * @apiSuccess {String}   deleted_at              ISO date when deleted
     * @apiSuccess {Object}   description             Description object
     * @apiSuccess {String}   description.description Beatmapset description
     * @apiSuccess {Number}   favourite_count         Number of favourites
     * @apiSuccess {Number}   genre_id                Genre ID
     * @apiSuccess {Object}   genre                   Genre object
     * @apiSuccess {Number}   genre.id                Genre ID
     * @apiSuccess {String}   genre.name              Genre name
     * @apiSuccess {Number}   id                      Beatmapset ID
     * @apiSuccess {Boolean}  is_scoreable            Whether scores can be submitted
     * @apiSuccess {Number}   language_id             Language ID
     * @apiSuccess {Object}   language                Language object
     * @apiSuccess {Number}   language.id             Language ID
     * @apiSuccess {String}   language.name           Language name
     * @apiSuccess {String}   last_updated            ISO date of last update
     * @apiSuccess {String}   more_information        Additional information
     * @apiSuccess {Boolean}  nsfw                    Whether the beatmapset is marked NSFW
     * @apiSuccess {Number}   offset                  Audio offset
     * @apiSuccess {Number}   play_count              Total play count
     * @apiSuccess {String}   preview_url             Audio preview URL
     * @apiSuccess {Number}   ranked                  Ranked status in integer
     * @apiSuccess {String}   ranked_date             ISO date when ranked
     * @apiSuccess {Number}   rating                  Average map rating
     * @apiSuccess {String}   source                  Source
     * @apiSuccess {Boolean}  spotlight               Whether this is a spotlight beatmapset
     * @apiSuccess {String}   status                  Ranked status as string
     * @apiSuccess {Boolean}  storyboard              Whether the beatmapset includes a storyboard
     * @apiSuccess {String}   submitted_date          ISO date when submitted
     * @apiSuccess {String}   tags                    Space-separated tags
     * @apiSuccess {String}   title                   Song title
     * @apiSuccess {String}   title_unicode           Song title (unicode)
     * @apiSuccess {Number}   user_id                 Mapper user ID
     * @apiSuccess {Boolean}  video                   Whether the beatmapset includes a video
     * @apiSuccess {Object}   covers                  Cover image URLs
     * @apiSuccess {String}   covers.cover
     * @apiSuccess {String}   covers.cover@2x
     * @apiSuccess {String}   covers.card
     * @apiSuccess {String}   covers.card@2x
     * @apiSuccess {String}   covers.list
     * @apiSuccess {String}   covers.list@2x
     * @apiSuccess {String}   covers.slimcover
     * @apiSuccess {String}   covers.slimcover@2x
     * @apiSuccess {Object}   availability
     * // download_disabled is not reliable, mirror stores its own state
     * @apiSuccess {String}   availability.more_information
     * @apiSuccess {Object[]} beatmaps                Array of beatmaps in this set (see /api/beatmap/:id for structure)
     * @apiSuccess {Object}   mirror                  Mirror-only data
     * @apiSuccess {Number}   mirror.beatmap_count
     * @apiSuccess {Boolean}  mirror.downloaded
     * @apiSuccess {Boolean}  mirror.download_disabled
     * @apiSuccess {Number}   mirror.file_size
     * @apiSuccess {Number}   mirror.mode_osu_count
     * @apiSuccess {Number}   mirror.mode_taiko_count
     * @apiSuccess {Number}   mirror.mode_fruits_count
     * @apiSuccess {Number}   mirror.mode_mania_count
     * @apiError 400 Invalid beatmapset ID (must be a positive number)
     * @apiError 404 Beatmapset not found
     * @apiError 500 Internal server error
     * @apiExample {curl} Example usage:
     *     curl https://mirror.nekoha.moe/api/beatmapset/12345
     */
    static async getBeatmapset(req: Request, res: Response): Promise<void> {
        const id = parseId(req.params.id);
        if (id === null) {
            sendError(res, 400, 'Invalid beatmapset ID. Must be a positive number.');
            return;
        }

        const beatmapset = await BeatmapsetService.getBeatmapset(id);
        if (!beatmapset) {
            sendError(res, 404, 'Beatmapset not found');
            return;
        }

        res.json(beatmapset);
    }

    /**
     * @api {get} /api/search Search beatmapsets
     * @apiName search
     * @apiGroup Beatmapset
     * @apiDescription Full beatmapset search with text, status, mode, difficulty, and metadata filters. Returns 100 results per page with embedded beatmaps array. Cached in Redis.
     * @apiParam {String}  [q]           Free-text search across title, artist, creator, tags, source
     * @apiParam {Number}  [page=1]      Page number (100 results per page)
     * @apiParam {String}  [sort]        Sort field: id, title, artist, creator, bpm, updated, ranked, submitted, favourites, difficulty
     * @apiParam {String}  [order=desc]  Sort direction: asc / desc
     * @apiParam {String}  [status]      Comma-separated status filter: ranked, approved, loved, qualified, pending, wip, graveyard
     * @apiParam {String}  [mode]        Comma-separated mode filter: osu, taiko, fruits, mania
     * @apiParam {Number}  [id]          Exact beatmapset ID lookup
     * @apiParam {Number}  [map_id]      Exact beatmap (difficulty) ID lookup
     * @apiParam {Number}  [stars_min]   Min difficulty rating (per-diff filter)
     * @apiParam {Number}  [stars_max]   Max difficulty rating (per-diff filter)
     * @apiParam {Number}  [ar_min]      Min approach rate
     * @apiParam {Number}  [ar_max]      Max approach rate
     * @apiParam {Number}  [cs_min]      Min circle size
     * @apiParam {Number}  [cs_max]      Max circle size
     * @apiParam {Number}  [od_min]      Min overall difficulty
     * @apiParam {Number}  [od_max]      Max overall difficulty
     * @apiParam {Number}  [hp_min]      Min drain rate
     * @apiParam {Number}  [hp_max]      Max drain rate
     * @apiParam {Number}  [bpm_min]     Min BPM (beatmapset level)
     * @apiParam {Number}  [bpm_max]     Max BPM (beatmapset level)
     * @apiParam {Number}  [length_min]  Min total length in seconds
     * @apiParam {Number}  [length_max]  Max total length in seconds
     * @apiParam {String}  [video]       Filter by video presence: "true" = has video, "false" = no video
     * @apiSuccess {Object[]} beatmapsets List of beatmapsets, each with a nested beatmaps array
     * @apiError 500 Internal server error
     * @apiExample {curl} Basic search:
     *     curl "https://mirror.nekoha.moe/api/search?q=camellia&status=ranked&page=1"
     * @apiExample {curl} With video filter:
     *     curl "https://mirror.nekoha.moe/api/search?video=true&status=ranked"
     */
    static async search(req: Request, res: Response): Promise<void> {
        const response = await SearchService.search(req.query);
        res.json(response);
    }

    /**
     * @api {get} /api/osz/:id Get .osz file size for a beatmapset
     * @apiName osz
     * @apiGroup Beatmapset
     * @apiDescription Returns the stored file size (in bytes) of a beatmapset's .osz archive.
     * @apiParam {Number} id Beatmapset ID
     * @apiSuccess {Number} id Beatmapset ID
     * @apiSuccess {Number} file_size Size of the .osz file in bytes
     * @apiError 400 Invalid beatmapset ID (must be a positive number)
     * @apiError 404 Beatmapset not found
     * @apiError 500 Internal server error
     * @apiExample {curl} Example usage:
     *     curl https://mirror.nekoha.moe/api/osz/12345
     */
    static async getOszSize(req: Request, res: Response): Promise<void> {
        const id = parseId(req.params.id);
        if (id === null) {
            sendError(res, 400, 'Invalid beatmapset ID. Must be a positive number.');
            return;
        }

        const oszSize = await BeatmapsetService.getOszSize(id);
        if (!oszSize) {
            sendError(res, 404, 'Beatmapset not found');
            return;
        }

        res.json(oszSize);
    }

    /**
     * @api {get} /api/oszFull Get all beatmapset .osz file sizes
     * @apiName oszFull
     * @apiGroup Beatmapset
     * @apiDescription Returns id + file_size for every beatmapset in the database.
     * @apiSuccess {Object[]} beatmapsets List of beatmapsets
     * @apiSuccess {Number} beatmapsets.id Beatmapset ID
     * @apiSuccess {Number} beatmapsets.file_size Size of the .osz file in bytes
     * @apiError 404 No beatmapsets found
     * @apiError 500 Internal server error
     * @apiExample {curl} Example usage:
     *     curl https://mirror.nekoha.moe/api/oszFull
     */
    static async getAllOszSizes(req: Request, res: Response): Promise<void> {
        const payload = await BeatmapsetService.getAllOszSizesJson();
        if (payload === null) {
            sendError(res, 404, 'No beatmapsets found (report this error)');
            return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Length', Buffer.byteLength(payload));
        res.end(payload);
    }
}