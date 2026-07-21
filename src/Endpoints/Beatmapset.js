// Beatmapset.js
import { app, pool, redis } from '../Constants.js';
import { serializeBeatmapset } from '../Helper/serializers.js'

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
app.get('/api/beatmapset/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `beatmapset:${id}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const numericId = parseInt(id, 10);
        if (isNaN(numericId) || numericId < 0) {
            res.setHeader('Content-Type', 'application/json');
            return res.status(400).json({ error: 'Invalid beatmapset ID. Must be a positive number.' });
        }

        const setResult = await pool.query(
            `SELECT * FROM ${process.env.TABLE_BEATMAPSET} WHERE id = $1`,
            [numericId]
        );

        if (setResult.rows.length === 0) {
            res.setHeader('Content-Type', 'application/json');
            return res.status(404).json({ error: 'Beatmapset not found' });
        }

        const beatmapResult = await pool.query(
            `SELECT * FROM ${process.env.TABLE_BEATMAP} WHERE beatmapset_id = $1`,
            [numericId]
        );

        const beatmapset = serializeBeatmapset(setResult.rows[0], beatmapResult.rows);
        await redis.set(cacheKey, JSON.stringify(beatmapset), 'EX', process.env.REDIS_CACHE_TIME);
        res.json(beatmapset);
    } catch (err) {
        console.error('Error fetching beatmapset:', err);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ error: 'Failed to fetch beatmapset' });
    }
});