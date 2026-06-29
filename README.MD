<a name="top"></a>
# mirror.nekoha.moe v1.1.4

REST API documentation for mirror.nekoha.moe

# Table of contents

- [Beatmap](#Beatmap)
  - [Get beatmap metadata](#Get-beatmap-metadata)
- [Beatmapset](#Beatmapset)
  - [Get .osz file size for a beatmapset](#Get-.osz-file-size-for-a-beatmapset)
  - [Get all beatmapset .osz file sizes](#Get-all-beatmapset-.osz-file-sizes)
  - [Get beatmapset metadata](#Get-beatmapset-metadata)
  - [Get full beatmapset info (with beatmaps array)](#Get-full-beatmapset-info-(with-beatmaps-array))
  - [Search beatmapsets](#Search-beatmapsets)
- [File](#File)
  - [Download a beatmapset (.osz file)](#Download-a-beatmapset-(.osz-file))
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

## <a name='Get-beatmap-metadata'></a> Get beatmap metadata
[Back to top](#top)

<p>Returns full metadata for a single beatmap (difficulty). Cached in Redis.</p>

```
GET /api4/beatmap/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmap ID</p> |

### Examples

Example usage:

```curl
curl https://mirror.nekoha.moe/api4/beatmap/123456
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmap ID</p> |
| beatmapset_id | `Number` | <p>Parent beatmapset ID</p> |
| version | `String` | <p>Difficulty name</p> |
| mode | `String` | <p>Game mode (osu/taiko/fruits/mania)</p> |
| difficulty_rating | `Number` | <p>Star rating</p> |
| ar | `Number` | <p>Approach rate</p> |
| cs | `Number` | <p>Circle size</p> |
| accuracy | `Number` | <p>Overall difficulty (OD)</p> |
| drain | `Number` | <p>HP drain rate</p> |
| bpm | `Number` | <p>BPM</p> |
| total_length | `Number` | <p>Total length in seconds</p> |
| hit_length | `Number` | <p>Drain length in seconds</p> |
| count_circles | `Number` | <p>Hit circle count</p> |
| count_sliders | `Number` | <p>Slider count</p> |
| count_spinners | `Number` | <p>Spinner count</p> |
| playcount | `Number` | <p>Play count for this difficulty</p> |
| passcount | `Number` | <p>Pass count for this difficulty</p> |
| status | `String` | <p>Ranked status</p> |
| is_scoreable | `Boolean` | <p>Whether scores can be submitted</p> |
| convert | `Boolean` | <p>Whether this is a converted difficulty</p> |
| checksum | `String` | <p>MD5 checksum of the .osu file</p> |
| last_updated | `String` | <p>ISO date of last update</p> |
| deleted_at | `String` | <p>ISO date when deleted (null if not deleted)</p> |

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
GET /api4/osz/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmapset ID</p> |

### Examples

Example usage:

```curl
curl https://mirror.nekoha.moe/api4/osz/12345
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
GET /api4/oszFull
```

### Examples

Example usage:

```curl
curl https://mirror.nekoha.moe/api4/oszFull
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

<p>Returns full metadata for a single beatmapset. Does not include the beatmaps array, use beatmapsetFull for that. Cached in Redis.</p>

```
GET /api4/beatmapset/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmapset ID</p> |

### Examples

Example usage:

```curl
curl https://mirror.nekoha.moe/api4/beatmapset/12345
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmapset ID</p> |
| title | `String` | <p>Song title</p> |
| artist | `String` | <p>Song artist</p> |
| creator | `String` | <p>Mapper username</p> |
| user_id | `Number` | <p>Mapper user ID</p> |
| status | `String` | <p>Ranked status (ranked/approved/loved/qualified/pending/wip/graveyard)</p> |
| bpm | `Number` | <p>BPM</p> |
| video | `Boolean` | <p>Whether the beatmapset includes a video</p> |
| storyboard | `Boolean` | <p>Whether the beatmapset includes a storyboard</p> |
| nsfw | `Boolean` | <p>Whether the beatmapset is marked NSFW</p> |
| favourite_count | `Number` | <p>Number of favourites</p> |
| play_count | `Number` | <p>Total play count</p> |
| file_size | `Number` | <p>.osz file size in bytes</p> |
| preview_url | `String` | <p>Audio preview URL (protocol-relative, e.g. //b.ppy.sh/preview/12345.mp3)</p> |
| tags | `String` | <p>Space-separated tags</p> |
| source | `String` | <p>Song source</p> |
| genre_id | `Number` | <p>Genre ID</p> |
| language_id | `Number` | <p>Language ID</p> |
| submitted_date | `String` | <p>ISO date when the beatmapset was submitted</p> |
| ranked_date | `String` | <p>ISO date when the beatmapset was ranked (null if not ranked)</p> |
| last_updated | `String` | <p>ISO date of last update</p> |
| downloaded | `Boolean` | <p>Whether the .osz file has been downloaded to the mirror</p> |
| missing_audio | `Boolean` | <p>Whether the file is unavailable due to missing audio</p> |
| dmca | `Boolean` | <p>Whether the file is unavailable due to DMCA</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 400 |  | <p>Invalid beatmapset ID (must be a positive number)</p> |
| 404 |  | <p>Beatmapset not found</p> |
| 500 |  | <p>Internal server error</p> |

## <a name='Get-full-beatmapset-info-(with-beatmaps-array)'></a> Get full beatmapset info (with beatmaps array)
[Back to top](#top)

<p>Same as /api4/beatmapset/:id but also includes a nested beatmaps array sorted by difficulty_rating ASC. Cached in Redis.</p>

```
GET /api4/beatmapsetFull/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmapset ID</p> |

### Examples

Example usage:

```curl
curl https://mirror.nekoha.moe/api4/beatmapsetFull/12345
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| beatmapset | `Object` | <p>Full beatmapset metadata (all fields from /beatmapset/:id)</p> |
| beatmapset.beatmaps | `Object[]` | <p>Array of beatmaps sorted by difficulty_rating ASC</p> |
| beatmapset.beatmaps.id | `Number` | <p>Beatmap ID</p> |
| beatmapset.beatmaps.version | `String` | <p>Difficulty name</p> |
| beatmapset.beatmaps.mode | `String` | <p>Game mode (osu/taiko/fruits/mania)</p> |
| beatmapset.beatmaps.difficulty_rating | `Number` | <p>Star rating</p> |
| beatmapset.beatmaps.ar | `Number` | <p>Approach rate</p> |
| beatmapset.beatmaps.cs | `Number` | <p>Circle size</p> |
| beatmapset.beatmaps.accuracy | `Number` | <p>Overall difficulty</p> |
| beatmapset.beatmaps.drain | `Number` | <p>HP drain rate</p> |
| beatmapset.beatmaps.bpm | `Number` | <p>BPM</p> |
| beatmapset.beatmaps.total_length | `Number` | <p>Total length in seconds</p> |
| beatmapset.beatmaps.hit_length | `Number` | <p>Drain length in seconds</p> |
| beatmapset.beatmaps.status | `String` | <p>Ranked status</p> |
| beatmapset.beatmaps.checksum | `String` | <p>MD5 checksum of the .osu file</p> |

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
GET /api4/search
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
curl "https://mirror.nekoha.moe/api4/search?q=camellia&status=ranked&page=1"
```

With video filter:

```curl
curl "https://mirror.nekoha.moe/api4/search?video=true&status=ranked"
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
GET /api4/download/:id
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
curl -OJ https://mirror.nekoha.moe/api4/download/12345
```

Download without video:

```curl
curl -OJ "https://mirror.nekoha.moe/api4/download/12345?noVideo=1"
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

# <a name='Request'></a> Request

## <a name='Create-beatmap-request-batch'></a> Create beatmap request batch
[Back to top](#top)

```
POST /api4/request
```

## <a name='Get-full-request-details'></a> Get full request details
[Back to top](#top)

```
GET /api4/request/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>request ID,</p> |

## <a name='List-all-beatmap-requests'></a> List all beatmap requests
[Back to top](#top)

```
GET /api4/request
```

# <a name='Stats'></a> Stats

## <a name='Get-beatmap-mirror-statistics'></a> Get beatmap mirror statistics
[Back to top](#top)

<p>Returns stats table row.</p>

```
GET /api4/stats
```

### Examples

Example usage:

```curl
curl https://mirror.nekoha.moe/api4/stats
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
GET /api4/download-stats
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
GET /api4/api-call-stats
```
### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| v1 | `Array` | <p>Array of { minute, calls } for API v1</p> |
| v2 | `Array` | <p>Array of { minute, calls } for API v2</p> |

