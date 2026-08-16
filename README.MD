<a name="top"></a>
# mirror.nekoha.moe v1.4.0

REST API documentation for mirror.nekoha.moe

# Table of contents

- [Beatmap](#Beatmap)
  - [Get beatmap audio preview](#Get-beatmap-audio-preview)
  - [Get beatmap metadata](#Get-beatmap-metadata)
- [Beatmapset](#Beatmapset)
  - [Get .osz file size for a beatmapset](#Get-.osz-file-size-for-a-beatmapset)
  - [Get all beatmapset .osz file sizes](#Get-all-beatmapset-.osz-file-sizes)
  - [Get beatmapset metadata](#Get-beatmapset-metadata)
  - [Search beatmapsets](#Search-beatmapsets)
- [File](#File)
  - [Download a beatmapset (.osz file)](#Download-a-beatmapset-(.osz-file))
  - [Get .osu file for a beatmap](#Get-.osu-file-for-a-beatmap)
  - [Get .osz archive contents](#Get-.osz-archive-contents)
- [Request](#Request)
  - [Create beatmap request batch](#Create-beatmap-request-batch)
  - [Get full request details](#Get-full-request-details)
  - [List all beatmap requests](#List-all-beatmap-requests)
- [Stats](#Stats)
  - [Get beatmap mirror statistics](#Get-beatmap-mirror-statistics)
  - [Get daily download statistics](#Get-daily-download-statistics)
  - [Get osu! API call statistics (last 6 hours, per minute)](#Get-osu!-API-call-statistics-(last-6-hours,-per-minute))

___


# <a name='Beatmap'></a> Beatmap

## <a name='Get-beatmap-audio-preview'></a> Get beatmap audio preview
[Back to top](#top)

<p>Get beatmap audio preview</p>

```
GET /api/beatmap/:id/preview
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmap ID</p> |

## <a name='Get-beatmap-metadata'></a> Get beatmap metadata
[Back to top](#top)

<p>Returns full metadata for a single beatmap. Cached in Redis.</p>

```
GET /api/beatmap/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmap ID</p> |

### Examples

Example usage:

```curl
curl https://mirror.nekoha.moe/api/beatmap/123456
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| beatmapset_id | `Number` | <p>Parent beatmapset ID</p> |
| difficulty_rating | `Number` | <p>Star rating</p> |
| id | `Number` | <p>Beatmap ID</p> |
| lazer_only | `Boolean` | <p>Whether this beatmap is only available in osu!lazer</p> |
| mode | `String` | <p>Game mode (osu/taiko/fruits/mania)</p> |
| status | `String` | <p>Ranked status</p> |
| total_length | `Number` | <p>Total length in seconds</p> |
| user_id | `Number` | <p>UserID of the beatmap creator</p> |
| version | `String` | <p>Difficulty name</p> |
| accuracy | `Number` | <p>Overall difficulty (OD)</p> |
| ar | `Number` | <p>Approach rate</p> |
| bpm | `Number` | <p>BPM</p> |
| convert | `Boolean` | <p>Whether this is a converted difficulty</p> |
| count_circles | `Number` | <p>Hit circle count</p> |
| count_sliders | `Number` | <p>Slider count</p> |
| count_spinners | `Number` | <p>Spinner count</p> |
| cs | `Number` | <p>Circle size</p> |
| deleted_at | `String` | <p>ISO date when deleted (null if not deleted)</p> |
| drain | `Number` | <p>HP drain rate</p> |
| hit_length | `Number` | <p>Drain length in seconds</p> |
| is_scoreable | `Boolean` | <p>Whether scores can be submitted</p> |
| last_updated | `String` | <p>ISO date of last update</p> |
| mode_int | `Number` | <p>Game mode (0 osu/1 taiko/2 fruits/3 mania)</p> |
| passcount | `Number` | <p>Pass count for this difficulty</p> |
| playcount | `Number` | <p>Play count for this difficulty</p> |
| ranked | `Number` | <p>Ranked status in integer</p> |
| url | `String` | <p>URL to beatmap</p> |
| checksum | `String` | <p>MD5 checksum of the .osu file</p> |
| max_combo | `Number` | <p>Max Combo</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 400 |  | <p>Invalid beatmap ID (must be a positive number)</p> |
| 404 |  | <p>Beatmap not found</p> |
| 500 |  | <p>Internal server error</p> |

# <a name='Beatmapset'></a> Beatmapset

## <a name='Get-.osz-file-size-for-a-beatmapset'></a> Get .osz file size for a beatmapset
[Back to top](#top)

<p>Returns the stored file size (in bytes) of a beatmapset's .osz archive.</p>

```
GET /api/osz/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmapset ID</p> |

### Examples

Example usage:

```curl
curl https://mirror.nekoha.moe/api/osz/12345
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmapset ID</p> |
| file_size | `Number` | <p>Size of the .osz file in bytes</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 400 |  | <p>Invalid beatmapset ID (must be a positive number)</p> |
| 404 |  | <p>Beatmapset not found</p> |
| 500 |  | <p>Internal server error</p> |

## <a name='Get-all-beatmapset-.osz-file-sizes'></a> Get all beatmapset .osz file sizes
[Back to top](#top)

<p>Returns id + file_size for every beatmapset in the database.</p>

```
GET /api/oszFull
```

### Examples

Example usage:

```curl
curl https://mirror.nekoha.moe/api/oszFull
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| beatmapsets | `Object[]` | <p>List of beatmapsets</p> |
| beatmapsets.id | `Number` | <p>Beatmapset ID</p> |
| beatmapsets.file_size | `Number` | <p>Size of the .osz file in bytes</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 404 |  | <p>No beatmapsets found</p> |
| 500 |  | <p>Internal server error</p> |

## <a name='Get-beatmapset-metadata'></a> Get beatmapset metadata
[Back to top](#top)

<p>Returns full metadata for a single beatmapset. Cached in Redis.</p>

```
GET /api/beatmapset/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmapset ID</p> |

### Examples

Example usage:

```curl
curl https://mirror.nekoha.moe/api/beatmapset/12345
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| anime_cover | `Boolean` | <p>Whether the cover uses anime art style</p> |
| artist | `String` | <p>Song artist</p> |
| artist_unicode | `String` | <p>Song artist (unicode)</p> |
| bpm | `Number` | <p>BPM</p> |
| creator | `String` | <p>Mapper username</p> |
| deleted_at | `String` | <p>ISO date when deleted</p> |
| description | `Object` | <p>Description object</p> |
| description.description | `String` | <p>Beatmapset description</p> |
| favourite_count | `Number` | <p>Number of favourites</p> |
| genre_id | `Number` | <p>Genre ID</p> |
| genre | `Object` | <p>Genre object</p> |
| genre.id | `Number` | <p>Genre ID</p> |
| genre.name | `String` | <p>Genre name</p> |
| id | `Number` | <p>Beatmapset ID</p> |
| is_scoreable | `Boolean` | <p>Whether scores can be submitted</p> |
| language_id | `Number` | <p>Language ID</p> |
| language | `Object` | <p>Language object</p> |
| language.id | `Number` | <p>Language ID</p> |
| language.name | `String` | <p>Language name</p> |
| last_updated | `String` | <p>ISO date of last update</p> |
| more_information | `String` | <p>Additional information</p> |
| nsfw | `Boolean` | <p>Whether the beatmapset is marked NSFW</p> |
| offset | `Number` | <p>Audio offset</p> |
| play_count | `Number` | <p>Total play count</p> |
| preview_url | `String` | <p>Audio preview URL</p> |
| ranked | `Number` | <p>Ranked status in integer</p> |
| ranked_date | `String` | <p>ISO date when ranked</p> |
| rating | `Number` | <p>Average map rating</p> |
| source | `String` | <p>Source</p> |
| spotlight | `Boolean` | <p>Whether this is a spotlight beatmapset</p> |
| status | `String` | <p>Ranked status as string</p> |
| storyboard | `Boolean` | <p>Whether the beatmapset includes a storyboard</p> |
| submitted_date | `String` | <p>ISO date when submitted</p> |
| tags | `String` | <p>Space-separated tags</p> |
| title | `String` | <p>Song title</p> |
| title_unicode | `String` | <p>Song title (unicode)</p> |
| user_id | `Number` | <p>Mapper user ID</p> |
| video | `Boolean` | <p>Whether the beatmapset includes a video</p> |
| covers | `Object` | <p>Cover image URLs</p> |
| covers.cover | `String` |  |
| covers.cover@2x | `String` |  |
| covers.card | `String` |  |
| covers.card@2x | `String` |  |
| covers.list | `String` |  |
| covers.list@2x | `String` |  |
| covers.slimcover | `String` |  |
| covers.slimcover@2x | `String` |  |
| availability | `Object` | <p>// download_disabled is not reliable, mirror stores its own state</p> |
| availability.more_information | `String` |  |
| beatmaps | `Object[]` | <p>Array of beatmaps in this set (see /api/beatmap/:id for structure)</p> |
| mirror | `Object` | <p>Mirror-only data</p> |
| mirror.beatmap_count | `Number` |  |
| mirror.downloaded | `Boolean` |  |
| mirror.download_disabled | `Boolean` |  |
| mirror.file_size | `Number` |  |
| mirror.mode_osu_count | `Number` |  |
| mirror.mode_taiko_count | `Number` |  |
| mirror.mode_fruits_count | `Number` |  |
| mirror.mode_mania_count | `Number` |  |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 400 |  | <p>Invalid beatmapset ID (must be a positive number)</p> |
| 404 |  | <p>Beatmapset not found</p> |
| 500 |  | <p>Internal server error</p> |

## <a name='Search-beatmapsets'></a> Search beatmapsets
[Back to top](#top)

<p>Full beatmapset search with text, status, mode, difficulty, and metadata filters. Returns 100 results per page with embedded beatmaps array. Cached in Redis.</p>

```
GET /api/search
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| q | `String` | **optional** <p>Free-text search across title, artist, creator, tags, source</p> |
| page | `Number` | **optional** <p>Page number (100 results per page)</p>_Default value: 1_<br> |
| sort | `String` | **optional** <p>Sort field: id, title, artist, creator, bpm, updated, ranked, submitted, favourites, difficulty</p> |
| order | `String` | **optional** <p>Sort direction: asc / desc</p>_Default value: desc_<br> |
| status | `String` | **optional** <p>Comma-separated status filter: ranked, approved, loved, qualified, pending, wip, graveyard</p> |
| mode | `String` | **optional** <p>Comma-separated mode filter: osu, taiko, fruits, mania</p> |
| id | `Number` | **optional** <p>Exact beatmapset ID lookup</p> |
| map_id | `Number` | **optional** <p>Exact beatmap (difficulty) ID lookup</p> |
| stars_min | `Number` | **optional** <p>Min difficulty rating (per-diff filter)</p> |
| stars_max | `Number` | **optional** <p>Max difficulty rating (per-diff filter)</p> |
| ar_min | `Number` | **optional** <p>Min approach rate</p> |
| ar_max | `Number` | **optional** <p>Max approach rate</p> |
| cs_min | `Number` | **optional** <p>Min circle size</p> |
| cs_max | `Number` | **optional** <p>Max circle size</p> |
| od_min | `Number` | **optional** <p>Min overall difficulty</p> |
| od_max | `Number` | **optional** <p>Max overall difficulty</p> |
| hp_min | `Number` | **optional** <p>Min drain rate</p> |
| hp_max | `Number` | **optional** <p>Max drain rate</p> |
| bpm_min | `Number` | **optional** <p>Min BPM (beatmapset level)</p> |
| bpm_max | `Number` | **optional** <p>Max BPM (beatmapset level)</p> |
| length_min | `Number` | **optional** <p>Min total length in seconds</p> |
| length_max | `Number` | **optional** <p>Max total length in seconds</p> |
| video | `String` | **optional** <p>Filter by video presence: &quot;true&quot; = has video, &quot;false&quot; = no video</p> |

### Examples

Basic search:

```curl
curl "https://mirror.nekoha.moe/api/search?q=camellia&status=ranked&page=1"
```

With video filter:

```curl
curl "https://mirror.nekoha.moe/api/search?video=true&status=ranked"
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| beatmapsets | `Object[]` | <p>List of beatmapsets, each with a nested beatmaps array</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 500 |  | <p>Internal server error</p> |

# <a name='File'></a> File

## <a name='Download-a-beatmapset-(.osz-file)'></a> Download a beatmapset (.osz file)
[Back to top](#top)

<p>Streams the .osz archive for the given beatmapset. If the beatmapset has a video and noVideo=1 is passed, the video files are stripped on-the-fly via zip repacking (yauzl + archiver). If the beatmapset has no video, the noVideo param is ignored and the file is streamed directly.</p>

```
GET /api/download/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmapset ID</p> |

### Query Parameters

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| noVideo | `String` | **optional** <p>Pass noVideo=1 to strip video files from the .osz (only applied when the beatmapset actually has a video)</p>_Default value: 0_<br> |

### Examples

Download with video (default):

```curl
curl -OJ https://mirror.nekoha.moe/api/download/12345
```

Download without video:

```curl
curl -OJ "https://mirror.nekoha.moe/api/download/12345?noVideo=1"
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| .osz | `File` | <p>The beatmapset archive file (application/x-osu-beatmap-archive)</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 400 |  | <p>Invalid beatmapset ID (must be a positive number)</p> |
| 404 |  | <p>Beatmapset not found (not yet downloaded), or folder/.osz is missing</p> |
| 410 |  | <p>Beatmapset unavailable (missing audio/DMCA takedown, NOTIFY ME TO FIX THIS SET)</p> |
| 500 |  | <p>Internal server error, or archive/repack failure</p> |

## <a name='Get-.osu-file-for-a-beatmap'></a> Get .osu file for a beatmap
[Back to top](#top)

<p>Returns the raw .osu file content for a beatmap.</p>

```
GET /api/osu/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmap ID</p> |

### Examples

Basic request:

```curl
curl -X GET https://mirror.nekoha.moe/api/osu/4753900
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| - | `String` | <p>Raw .osu file content (text/plain)</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 400 |  | <p>Invalid beatmap ID (must be a positive number)</p> |
| 404 |  | <p>.osu file not found for this beatmap</p> |
| 500 |  | <p>Invalid or corrupted zip archive</p> |

## <a name='Get-.osz-archive-contents'></a> Get .osz archive contents
[Back to top](#top)

<p>Returns json of files inside .osz archive.</p>

```
GET /api/osz/:id/content
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmapset ID</p> |

### Examples

Basic request:

```curl
curl -X GET https://mirror.nekoha.moe/api/osz/12345/content
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmapset ID</p> |
| file | `String` | <p>Name of the .osz file</p> |
| entries | `Object[]` | <p>List of archive entries</p> |
| entries.name | `String` | <p>File path inside archive</p> |
| entries.directory | `Boolean` | <p>Whether entry is a directory</p> |
| entries.compressedSizeBytes | `Number` | <p>Size of compressed data in bytes</p> |
| entries.uncompressedSizeBytes | `Number` | <p>Size after extraction in bytes</p> |
| entries.crc32 | `Number` | <p>CRC32 checksum of entry</p> |
| entries.version | `Number` | <p>ZIP version required to extract entry</p> |

### Success response example

#### Success response example - `Success response:`

```json
{
  "id": 12345,
  "file": "song.osz",
  "entries": [
    {
      "name": "Audio.mp3",
      "directory": false,
      "compressedSizeBytes": 1234567,
      "uncompressedSizeBytes": 2345678,
      "crc32": 123456789,
      "version": 20
    }
  ]
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 400 |  | <p>Invalid beatmapset ID (must be a positive number)</p> |
| 404 |  | <p>Beatmapset not found or no .osz file exists</p> |
| 500 |  | <p>Invalid or corrupted ZIP archive, or internal server error</p> |

# <a name='Request'></a> Request

## <a name='Create-beatmap-request-batch'></a> Create beatmap request batch
[Back to top](#top)

```
POST /apirequest
```

## <a name='Get-full-request-details'></a> Get full request details
[Back to top](#top)

```
GET /api/request/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>request ID,</p> |

## <a name='List-all-beatmap-requests'></a> List all beatmap requests
[Back to top](#top)

```
GET /api/request
```

# <a name='Stats'></a> Stats

## <a name='Get-beatmap-mirror-statistics'></a> Get beatmap mirror statistics
[Back to top](#top)

<p>Returns stats table row.</p>

```
GET /api/stats
```

### Examples

Example usage:

```curl
curl https://mirror.nekoha.moe/api/stats
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| beatmapset_count | `Number` | <p>Total number of beatmapsets stored</p> |
| beatmap_count | `Number` | <p>Total number of individual beatmaps</p> |
| total_size | `Number` | <p>Total storage size in bytes</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 404 |  | <p>No stats found</p> |
| 500 |  | <p>Internal server error</p> |

## <a name='Get-daily-download-statistics'></a> Get daily download statistics
[Back to top](#top)

```
GET /api/download-stats
```

### Query Parameters

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| days | `Number` | **optional** <p>Number of past days to return</p>_Default value: 30_<br> |
### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| rows | `Array` | <p>Array of { day, downloads, bytes_sent }</p> |

## <a name='Get-osu!-API-call-statistics-(last-6-hours,-per-minute)'></a> Get osu! API call statistics (last 6 hours, per minute)
[Back to top](#top)

```
GET /api/api-call-stats
```
### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| v1 | `Array` | <p>Array of { minute, calls } for API v1</p> |
| v2 | `Array` | <p>Array of { minute, calls } for API v2</p> |

