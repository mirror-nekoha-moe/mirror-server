import fs from 'fs';
import path from 'path';
import { app, pool } from '../Constants.js';
/**
 * @api {get} /api4/download/:id Download a beatmapset (.osz file)
 * @apiName download
 * @apiGroup File
 * @apiDescription Streams the .osz archive for the given beatmapset. If the beatmapset has a video and noVideo=1 is passed, the video files are stripped on-the-fly via zip repacking (yauzl + archiver). If the beatmapset has no video, the noVideo param is ignored and the file is streamed directly.
 * @apiParam {Number} id Beatmapset ID
 * @apiQuery {String} [noVideo=0] Pass noVideo=1 to strip video files from the .osz (only applied when the beatmapset actually has a video)
 * @apiSuccess {File} .osz The beatmapset archive file (application/x-osu-beatmap-archive)
 * @apiError 400 Invalid beatmapset ID (must be a positive number)
 * @apiError 404 Beatmapset not found (not yet downloaded), or folder/.osz is missing
 * @apiError 410 Beatmapset unavailable (missing audio/DMCA takedown, NOTIFY ME TO FIX THIS SET)
 * @apiError 500 Internal server error, or archive/repack failure
 * @apiExample {curl} Download with video (default):
 *     curl -OJ https://mirror.nekoha.moe/api4/download/12345
 * @apiExample {curl} Download without video:
 *     curl -OJ "https://mirror.nekoha.moe/api4/download/12345?noVideo=1"
 */
app.get('/api4/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId) || numericId < 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'Invalid beatmapset ID. Must be a positive number.' });
    }
    
    // Check if beatmapset exists and is downloaded
    const result = await pool.query(
      `SELECT * FROM ${process.env.TABLE_BEATMAPSET} WHERE id = $1`,
      [numericId]
    );
    
    if (result.rows.length === 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'Beatmapset not found' });
    }
    
    const beatmapset = result.rows[0];
    
    if (!beatmapset.downloaded) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'Beatmapset not downloaded yet' });
    }
    
    if (beatmapset.missing_audio) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(410).json({ error: 'Beatmapset missing (not available for download)\nContact me to upload this mapset.' });
    }

    if (beatmapset.dmca) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(410).json({ error: 'Beatmapset missing (dmca takedown)\nContact me to upload this mapset.' });
    }

    
    // Find the beatmapset folder inside STORAGE_DIR
    const storagePath = process.env.STORAGE_DIR;
    const beatmapsetFolder = path.join(storagePath, String(numericId));

    if (!fs.existsSync(beatmapsetFolder) || !fs.lstatSync(beatmapsetFolder).isDirectory()) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'Beatmapset folder not found in storage' });
    }

    // Find .osz file inside the beatmapset folder (pick largest if multiple)
    const files = fs.readdirSync(beatmapsetFolder);
    const oszFile = files
      .filter(file => file.endsWith('.osz'))
      .sort((a, b) => fs.statSync(path.join(beatmapsetFolder, b)).size - fs.statSync(path.join(beatmapsetFolder, a)).size)[0];

    if (!oszFile) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'Beatmapset .osz file not found in folder' });
    }

    const filePath = path.join(beatmapsetFolder, oszFile);

    // Only attempt video stripping if the map actually has a video
    const noVideo = req.query.noVideo === '1' && beatmapset.video === true;
    const VIDEO_EXTS = /\.(avi|flv|mp4|mov|wmv|m4v|mkv|flv)$/i;

    // Set headers for download
    res.setHeader('Content-Type', 'application/x-osu-beatmap-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${oszFile}"`);

    const fileSize = beatmapset.file_size ? BigInt(beatmapset.file_size) : 0n;

    if (noVideo) {
      // Stream a repackaged zip with video entries removed
      // store = no recompression
      const archive = new ZipArchive({ store: true });
      archive.pipe(res);
      archive.on('error', err => {
        console.error('Archiver error:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to repack beatmapset' });
        else res.destroy(err);
      });

      yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          console.error('yauzl open error:', err);
          if (!res.headersSent) res.status(500).json({ error: 'Failed to open beatmapset archive' });
          return;
        }
        zipfile.readEntry();
        zipfile.on('entry', entry => {
          if (VIDEO_EXTS.test(entry.fileName)) {
            // Skip video files
            zipfile.readEntry();
            return;
          }
          zipfile.openReadStream(entry, (err, stream) => {
            if (err) { zipfile.readEntry(); return; }
            archive.append(stream, { name: entry.fileName });
            stream.on('end', () => zipfile.readEntry());
          });
        });
        zipfile.on('end', () => archive.finalize());
        zipfile.on('error', err => {
          console.error('yauzl error:', err);
          archive.abort();
        });
      });

      // Track stats (use stored file_size as approximation since we strip video)
      res.on('finish', () => {
        pool.query(`
          INSERT INTO download_stats (day, downloads, bytes_sent)
          VALUES (CURRENT_DATE, 1, $1)
          ON CONFLICT (day) DO UPDATE
            SET downloads  = download_stats.downloads  + 1,
                bytes_sent = download_stats.bytes_sent + $1
        `, [fileSize]).catch(err => console.error('Failed to update download_stats:', err));
      });
    } else {
      // Stream the file efficiently to the client
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('open', () => {
        fileStream.pipe(res);
      });
      fileStream.on('error', (err) => {
        console.error('Error streaming file:', err);
        if (!res.headersSent) {
          res.setHeader('Content-Type', 'application/json');
          res.status(500).json({ error: 'Failed to stream beatmapset file' });
        } else {
          res.destroy(err);
        }
      });
      // Track completed download stats
      res.on('finish', () => {
        pool.query(`
          INSERT INTO download_stats (day, downloads, bytes_sent)
          VALUES (CURRENT_DATE, 1, $1)
          ON CONFLICT (day) DO UPDATE
            SET downloads  = download_stats.downloads  + 1,
                bytes_sent = download_stats.bytes_sent + $1
        `, [fileSize]).catch(err => console.error('Failed to update download_stats:', err));
      });
      // If client aborts, destroy the stream
      res.on('close', () => {
        fileStream.destroy();
      });
    }
    
  } catch (err) {
    console.error('Error downloading beatmapset:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to download beatmapset' });
  }
});
