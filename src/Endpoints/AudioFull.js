/**
 * api {get} /api/beatmap/:id/audio Get full audio file
 * apiName beatmap-audio
 * apiDescription Streams the full audio file
 */
// app.get('/api/beatmap/:id/audio', async (req, res) => {
//     try {
//         const numericId = parseInt(req.params.id, 10);
//         if (isNaN(numericId) || numericId < 0) {
//             return res.status(400).json({
//                 error: 'Invalid beatmap ID'
//             });
//         }

//         const result = await pool.query(`SELECT * FROM ${process.env.TABLE_BEATMAP} WHERE id = $1`, [numericId]);
//         if (result.rows.length === 0) {
//             return res.status(404).json({
//                 error: 'Beatmap not found'
//             });
//         }

//         const beatmap = result.rows[0];
//         const oszPath = await getOszPath(beatmap);
//         if (!oszPath) {
//             return res.status(404).json({
//                 error: 'Beatmapset .osz not found'
//             });
//         } 

//         const audioInfo = await locateBeatmapAudio(oszPath, beatmap);
//         if (!audioInfo) {
//             return res.status(404).json({
//                 error: '.osu file or AudioFilename not found'
//             });
//         }

//         res.setHeader('Content-Type', 'audio/mpeg');
//         const found = await getAudioStream(oszPath, audioInfo.audioFile, res);
//         if (!found) {
//             res.status(404).json({
//                 error: 'Audio file not found.'
//             });
//         }
//     } catch (err) {
//         console.error('audio stream error:', err);
//         if (!res.headersSent) res.status(500).json({ error: 'Failed to stream audio' });
//     }
// });
