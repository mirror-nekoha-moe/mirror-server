import { Request, Response } from 'express';
import { parseId, sendError } from '@Core/Http/Http';
import { BeatmapService } from '@Service/BeatmapService';

export class BeatmapController {
    /**
     * @api {get} /api/beatmap/:id Get beatmap metadata
     * @apiName beatmap
     * @apiGroup Beatmap
     * @apiDescription Returns full metadata for a single beatmap. Cached in Redis.
     * @apiParam {Number} id Beatmap ID
     * @apiSuccess {Number}  beatmapset_id      Parent beatmapset ID
     * @apiSuccess {Number}  difficulty_rating  Star rating
     * @apiSuccess {Number}  id                 Beatmap ID
     * @apiSuccess {Boolean} lazer_only         Whether this beatmap is only available in osu!lazer
     * @apiSuccess {String}  mode               Game mode (osu/taiko/fruits/mania)
     * @apiSuccess {String}  status             Ranked status
     * @apiSuccess {Number}  total_length       Total length in seconds
     * @apiSuccess {Number}  user_id            UserID of the beatmap creator
     * @apiSuccess {String}  version            Difficulty name
     * @apiSuccess {Number}  accuracy           Overall difficulty (OD)
     * @apiSuccess {Number}  ar                 Approach rate
     * @apiSuccess {Number}  bpm                BPM
     * @apiSuccess {Boolean} convert            Whether this is a converted difficulty
     * @apiSuccess {Number}  count_circles      Hit circle count
     * @apiSuccess {Number}  count_sliders      Slider count
     * @apiSuccess {Number}  count_spinners     Spinner count
     * @apiSuccess {Number}  cs                 Circle size
     * @apiSuccess {String}  deleted_at         ISO date when deleted (null if not deleted)
     * @apiSuccess {Number}  drain              HP drain rate
     * @apiSuccess {Number}  hit_length         Drain length in seconds
     * @apiSuccess {Boolean} is_scoreable       Whether scores can be submitted
     * @apiSuccess {String}  last_updated       ISO date of last update
     * @apiSuccess {Number}  mode_int           Game mode (0 osu/1 taiko/2 fruits/3 mania)
     * @apiSuccess {Number}  passcount          Pass count for this difficulty
     * @apiSuccess {Number}  playcount          Play count for this difficulty
     * @apiSuccess {Number}  ranked             Ranked status in integer
     * @apiSuccess {String}  url                URL to beatmap
     * @apiSuccess {String}  checksum           MD5 checksum of the .osu file
     * @apiSuccess {Number}  max_combo          Max Combo
     * @apiError 400 Invalid beatmap ID (must be a positive number)
     * @apiError 404 Beatmap not found
     * @apiError 500 Internal server error
     * @apiExample {curl} Example usage:
     *     curl https://mirror.nekoha.moe/api/beatmap/123456
     */
    static async getBeatmap(req: Request, res: Response): Promise<void> {
        const id = parseId(req.params.id);
        if (id === null) {
            sendError(res, 400, 'Invalid beatmap ID. Must be a positive number.');
            return;
        }

        const beatmap = await BeatmapService.getBeatmap(id);
        if (!beatmap) {
            sendError(res, 404, 'Beatmap not found');
            return;
        }

        res.json(beatmap);
    }
}