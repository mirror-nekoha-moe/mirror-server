import fs from 'fs';
import path from 'path';

import { app, pool, yauzl } from '../Constants.js';

/**
 * @api {get} /api4/osz/:id/content Get .osz archive contents
 * @apiName osz-content
 * @apiGroup File
 * @apiDescription Returns json of files inside .osz archive.
 * @apiParam {Number} id Beatmapset ID
 * @apiSuccess {Number} id Beatmapset ID
 * @apiSuccess {String} file Name of the .osz file
 * @apiSuccess {Object[]} entries List of archive entries
 * @apiSuccess {String} entries.name File path inside archive
 * @apiSuccess {Boolean} entries.directory Whether entry is a directory
 * @apiSuccess {Number} entries.compressedSizeBytes Size of compressed data in bytes
 * @apiSuccess {Number} entries.uncompressedSizeBytes Size after extraction in bytes
 * @apiSuccess {Number} entries.crc32 CRC32 checksum of entry
 * @apiSuccess {Number} entries.version ZIP version required to extract entry
 *
 * @apiError 400 Invalid beatmapset ID (must be a positive number)
 * @apiError 404 Beatmapset not found or no .osz file exists
 * @apiError 500 Invalid or corrupted ZIP archive, or internal server error
 *
 * @apiExample {curl} Basic request:
 *     curl -X GET https://mirror.nekoha.moe/api4/osz/12345/content
 *
 * @apiSuccessExample {json} Success response:
 * {
 *   "id": 12345,
 *   "file": "song.osz",
 *   "entries": [
 *     {
 *       "name": "Audio.mp3",
 *       "directory": false,
 *       "compressedSizeBytes": 1234567,
 *       "uncompressedSizeBytes": 2345678,
 *       "crc32": 123456789,
 *       "version": 20
 *     }
 *   ]
 * }
 */
app.get('/api4/osz/:id/content', async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId) || numericId < 0) {
      return res.status(400).json({
        error: 'Invalid beatmapset ID'
      });
    }

    // fetch beatmapset
    const result = await pool.query(
      `SELECT * FROM ${process.env.TABLE_BEATMAPSET} WHERE id = $1`,
      [numericId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beatmapset not found' });
    }

    const beatmapset = result.rows[0];

    const storagePath = process.env.STORAGE_DIR;
    const folder = path.join(storagePath, String(numericId));

    if (!fs.existsSync(folder) || !fs.lstatSync(folder).isDirectory()) {
      return res.status(404).json({ error: 'Beatmapset folder not found' });
    }

    const files = fs.readdirSync(folder);
    const oszFile = files
      .filter(f => f.endsWith('.osz'))
      .sort((a, b) =>
        fs.statSync(path.join(folder, b)).size -
        fs.statSync(path.join(folder, a)).size
      )[0];

    if (!oszFile) {
      return res.status(404).json({ error: 'No .osz file found' });
    }

    const filePath = path.join(folder, oszFile);

    // OPEN ZIP
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        return res.status(500).json({
          error: 'Invalid or corrupted zip archive'
        });
      }

      const entries = [];

      zipfile.readEntry();

      zipfile.on('entry', entry => {
        const isDirectory = /\/$/.test(entry.fileName);

        entries.push({
          name: entry.fileName,
          directory: isDirectory,
          compressedSizeBytes: entry.compressedSize,
          uncompressedSizeBytes: entry.uncompressedSize,
          crc32: entry.crc32,
          version: entry.versionNeededToExtract
        });

        zipfile.readEntry();
      });

      zipfile.on('end', () => {
        return res.json({
          id: numericId,
          file: oszFile,
          entries
        });
      });

      zipfile.on('error', err => {
        console.error('zip read error:', err);
        return res.status(500).json({
          error: 'Invalid or corrupted zip archive'
        });
      });
    });

  } catch (err) {
    console.error('osz contents error:', err);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});