<a name="top"></a>
# mirror.nekoha.moe v1.0.0

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
- [Stats](#Stats)
  - [Get beatmap mirror statistics](#Get-beatmap-mirror-statistics)

___


# <a name='Beatmap'></a> Beatmap

## <a name='Get-beatmap-metadata'></a> Get beatmap metadata
[Back to top](#top)

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
| beatmap | `Object` | <p>Beatmap metadata object</p> |

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
| 400 |  | <p>Invalid beatmapset ID</p> |
| 404 |  | <p>Beatmapset not found</p> |
| 500 |  | <p>Internal server error</p> |

## <a name='Get-all-beatmapset-.osz-file-sizes'></a> Get all beatmapset .osz file sizes
[Back to top](#top)

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
| beatmapset | `Object` | <p>Beatmapset metadata object</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 400 |  | <p>Invalid beatmapset ID (must be a positive number)</p> |
| 404 |  | <p>Beatmapset not found</p> |
| 500 |  | <p>Internal server error</p> |

## <a name='Get-full-beatmapset-info-(with-beatmaps-array)'></a> Get full beatmapset info (with beatmaps array)
[Back to top](#top)

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
| beatmapset | `Object` | <p>Beatmapset metadata object</p> |
| beatmapset.beatmaps | `Object[]` | <p>Array of beatmaps in this beatmapset, sorted by difficulty_rating ASC</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 400 |  | <p>Invalid beatmapset ID (must be a positive number)</p> |
| 404 |  | <p>Beatmapset not found</p> |
| 500 |  | <p>Internal server error</p> |

## <a name='Search-beatmapsets'></a> Search beatmapsets
[Back to top](#top)

```
GET /api4/search
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| q | `String` | **optional** <p>General search (title, artist, creator, tags)</p> |
| page | `Number` | **optional** <p>Page number (pagination, 100 per page)</p>_Default value: 1_<br> |
| sort | `String` | **optional** <p>Sort field</p> |
| order | `String` | **optional** <p>Sort order (asc/desc)</p>_Default value: desc_<br> |

### Examples

Example usage:

```curl
curl "https://mirror.nekoha.moe/api4/search?q=camellia&page=1"
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| beatmapsets | `Object[]` | <p>List of beatmapsets with beatmaps array</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 500 |  | <p>Internal server error</p> |

# <a name='File'></a> File

## <a name='Download-a-beatmapset-(.osz-file)'></a> Download a beatmapset (.osz file)
[Back to top](#top)

```
GET /api4/download/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>Beatmapset ID</p> |

### Examples

Example usage:

```curl
curl -OJ https://mirror.nekoha.moe/api4/download/12345
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| .osz | `File` | <p>The beatmapset archive file</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 400 |  | <p>Invalid beatmapset ID (must be a positive number)</p> |
| 404 |  | <p>Beatmapset not found, not downloaded, folder missing, or .osz file missing</p> |
| 410 |  | <p>Beatmapset missing audio (not available for download)</p> |
| 500 |  | <p>Internal server error</p> |

# <a name='Stats'></a> Stats

## <a name='Get-beatmap-mirror-statistics'></a> Get beatmap mirror statistics
[Back to top](#top)

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
| last_beatmapset_id | `Number` | <p>Last beatmapset ID in the database</p> |
| beatmapset_count | `Number` | <p>Total number of beatmapsets</p> |
| beatmap_count | `Number` | <p>Total number of beatmaps</p> |
| ranked_count | `Number` | <p>Number of ranked beatmapsets</p> |
| approved_count | `Number` | <p>Number of approved beatmapsets</p> |
| loved_count | `Number` | <p>Number of loved beatmapsets</p> |
| graveyard_count | `Number` | <p>Number of graveyard beatmapsets</p> |
| pending_count | `Number` | <p>Number of pending beatmapsets</p> |
| total_size | `Number` | <p>Total size of all .osz files (bytes)</p> |
| bm_ranked_count | `Number` | <p>Number of ranked beatmaps</p> |
| bm_approved_count | `Number` | <p>Number of approved beatmaps</p> |
| bm_loved_count | `Number` | <p>Number of loved beatmaps</p> |
| bm_graveyard_count | `Number` | <p>Number of graveyard beatmaps</p> |
| bm_pending_count | `Number` | <p>Number of pending beatmaps</p> |
| missing_beatmapsets | `Number` | <p>Number of missing beatmapsets</p> |
| osu_bm_ranked_count | `Number` | <p>Ranked osu! beatmaps</p> |
| osu_bm_approved_count | `Number` | <p>Approved osu! beatmaps</p> |
| osu_bm_loved_count | `Number` | <p>Loved osu! beatmaps</p> |
| osu_bm_graveyard_count | `Number` | <p>Graveyard osu! beatmaps</p> |
| osu_bm_pending_count | `Number` | <p>Pending osu! beatmaps</p> |
| taiko_bm_ranked_count | `Number` | <p>Ranked taiko beatmaps</p> |
| taiko_bm_approved_count | `Number` | <p>Approved taiko beatmaps</p> |
| taiko_bm_loved_count | `Number` | <p>Loved taiko beatmaps</p> |
| taiko_bm_graveyard_count | `Number` | <p>Graveyard taiko beatmaps</p> |
| taiko_bm_pending_count | `Number` | <p>Pending taiko beatmaps</p> |
| fruits_bm_ranked_count | `Number` | <p>Ranked ctb beatmaps</p> |
| fruits_bm_approved_count | `Number` | <p>Approved ctb beatmaps</p> |
| fruits_bm_loved_count | `Number` | <p>Loved ctb beatmaps</p> |
| fruits_bm_graveyard_count | `Number` | <p>Graveyard ctb beatmaps</p> |
| fruits_bm_pending_count | `Number` | <p>Pending ctb beatmaps</p> |
| mania_bm_ranked_count | `Number` | <p>Ranked mania beatmaps</p> |
| mania_bm_approved_count | `Number` | <p>Approved mania beatmaps</p> |
| mania_bm_loved_count | `Number` | <p>Loved mania beatmaps</p> |
| mania_bm_graveyard_count | `Number` | <p>Graveyard mania beatmaps</p> |
| mania_bm_pending_count | `Number` | <p>Pending mania beatmaps</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| 404 |  | <p>No stats found</p> |
| 500 |  | <p>Internal server error</p> |

