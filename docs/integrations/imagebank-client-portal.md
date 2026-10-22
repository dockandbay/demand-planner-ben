# Horizon client portal: connecting to ImageBank

How Horizon shows ImageBank galleries to wholesale customers in its client portal.

**Audience:** whoever builds the Horizon side (person or Claude session).
**ImageBank owner:** Ben (Dock & Bay). **API version:** v1.

## How it works

- Dock & Bay admins choose which galleries wholesale customers may see. In ImageBank they open a team collection and turn on **Share with Horizon client portal**.
- Wholesale customers **sign in to Horizon's client portal only**. They never sign in to ImageBank and never get ImageBank links.
- **Horizon's server** calls ImageBank's API with a secret key, then renders the galleries in the portal.
- ImageBank never sends **unretouched previews**, galleries that are not shared, or anything private.
- There are no public links. Image and download URLs are short-lived, signed URLs that expire.

```
Wholesale customer ──signs in──> Horizon client portal (browser)
                                        │
                                        ▼
                                 Horizon server ──Bearer API key──> ImageBank /api/v1/portal/*
                                        │                                  │
                                        │<── gallery JSON + signed URLs ───┘
                                        ▼
           customer's browser loads thumbnails / previews from the signed URLs
           and downloads originals from short-lived Dropbox links
```

## Setup

1. An ImageBank admin opens **Settings > Integrations** and presses **Create key** (name: "Horizon client portal"). The key starts with `ibk_` and is shown **once**. (Done on 22-Oct-26: the live key is in the local .env as IMAGEBANK_API_KEY (never commit it). Its "Last used" date appears in Settings > Integrations after Horizon's first successful call.)
2. Add two server-side environment variables to Horizon (its Vercel project and local `.env`):

   ```
   IMAGEBANK_URL=https://imagebank.dockandbay.com
   IMAGEBANK_API_KEY=ibk_...
   ```

3. Never send the key to a browser, put it in client-side code or a URL, or paste it into chat. ImageBank stores only a fingerprint of it. If it leaks, an admin revokes it in Settings > Integrations and creates a new one.
4. Check the connection from Horizon's server (the key comes from the environment, never typed into code):

   ```sh
   curl -s -H "Authorization: Bearer $IMAGEBANK_API_KEY" "$IMAGEBANK_URL/api/v1/portal/galleries" | head -c 300
   ```

   `{"galleries":[...]}` means it works (an empty list until an admin shares a gallery); `401` means the key is wrong or missing.
5. For local development against a local ImageBank, use `IMAGEBANK_URL=http://localhost:3000` and a key created in the local Settings > Integrations.

## Authentication

Every request sends the key as a bearer token:

```
Authorization: Bearer ibk_...
```

A missing, unknown or revoked key returns `401`. Each successful call updates the key's "last used" date in ImageBank.

## Endpoints

Base URL: `${IMAGEBANK_URL}/api/v1/portal`. All responses are JSON. Dates are ISO 8601 in UTC.

### List shared galleries

`GET /galleries?q=lookbook&sort=name`

| Parameter | Default | Notes |
| --- | --- | --- |
| `q` | none | Matches words in the gallery title or description (case-insensitive) |
| `sort` | `shared` | `shared` (most recently shared first), `name` (A to Z), `updated` (most recently changed first) |

```json
{
  "galleries": [
    {
      "id": "3f1c…",
      "title": "SS26 Wholesale lookbook",
      "description": "Hero and lifestyle images for SS26",
      "imageCount": 48,
      "coverUrl": "https://…supabase.co/storage/v1/object/sign/renditions/…/preview.jpg?token=…",
      "sharedAt": "2026-10-21T05:30:10Z",
      "updatedAt": "2026-10-21T05:30:10Z"
    }
  ],
  "query": { "q": "lookbook", "sort": "name" },
  "urlsExpireInSeconds": 3600
}
```

Without `sort`, galleries are ordered by most recently shared. `coverUrl` is the chosen cover image, or the gallery's first image when none is chosen; it is `null` only for an empty gallery.

### One gallery, with its images

`GET /galleries/{id}?limit=60&offset=0&q=beach&sort=newest&product=TOWLB-SUM-OCEAN`

| Parameter | Default | Notes |
| --- | --- | --- |
| `limit` | 60 | 1 to 200 |
| `offset` | 0 | For paging; use `page.nextOffset` |
| `q` | none | Search inside the gallery. Every word must match the start of a word in the filename, title, caption, or a linked product's code, name or colourway (`ocean tow` finds "Quick Dry Towel - Ocean Pavilion"). |
| `sort` | `gallery` | `gallery` (the order Dock & Bay arranged), `newest` / `oldest` (by capture date), `name` (filename A to Z) |
| `product` | none | A product code (style + colourway, e.g. `TOWLB-SUM-OCEAN`). Returns only images linked to that product, for product pages in the portal. Combines with `q` and `sort`. |

```json
{
  "gallery": { "id": "3f1c…", "title": "SS26 Wholesale lookbook", "description": "…", "sharedAt": "…", "updatedAt": "…" },
  "images": [
    {
      "id": "a91e…",
      "filename": "MALLORCA25-SS26-TOWLB-SUM-OCEAN-D2-043.jpg",
      "title": null,
      "caption": null,
      "width": 6083,
      "height": 4068,
      "capturedAt": "2025-06-14T09:12:00Z",
      "thumbUrl": "https://…/thumb.jpg?token=…",
      "previewUrl": "https://…/preview.jpg?token=…",
      "products": [
        { "code": "TOWLB-SUM-OCEAN", "name": "Quick Dry Towel - Ocean Pavilion", "colourway": "Ocean Pavilion" }
      ],
      "versions": [
        { "id": "a91e…", "label": "High res (uncropped)", "format": "jpg", "width": 6083, "height": 4068, "bytes": 13631488, "isDefault": true },
        { "id": "77b2…", "label": "Square 1500px", "format": "jpg", "width": 1500, "height": 1500, "bytes": 512000, "isDefault": false }
      ]
    }
  ],
  "query": { "q": "beach", "product": null, "sort": "newest" },
  "page": { "limit": 60, "offset": 0, "total": 48, "nextOffset": 60 },
  "urlsExpireInSeconds": 3600
}
```

- **One entry per shot.** A shot's exports (high res, square crop, banner crop, screen res, studio PNG sizes and so on) are listed under `versions`, with the default first (high res uncropped, or PNG 2000px for studio product shots).
- `thumbUrl` is about 640px; `previewUrl` is up to 2048px. Either may be `null` while ImageBank is still processing a new image.
- `page.total` counts the images matching the search, not the whole gallery. Keep `q`, `sort` and `product` the same while paging with `nextOffset`.
- Unknown or unshared gallery ids return `404`.

### Download one version

`GET /images/{versionId}/download`

Optional header: `X-Portal-Customer: <Horizon customer id>`. It is recorded in ImageBank's audit log; use Horizon's customer or account id, not a personal email.

```json
{
  "url": "https://dl.dropboxusercontent.com/…",
  "filename": "MALLORCA25-SS26-TOWLB-SUM-OCEAN-D2-043.jpg",
  "bytes": 13631488,
  "expiresAt": "2026-10-21T09:30:00Z"
}
```

- `versionId` is any `versions[].id` from the gallery response. ImageBank checks again that it belongs to a shared shot and is not an unretouched preview; otherwise it returns `404`.
- `url` is a temporary Dropbox link that is valid for about 4 hours. Call this endpoint **when the customer clicks Download**, then redirect their browser to `url`. Don't store links or send them by email.

## Errors

```json
{ "error": { "code": "not_found", "message": "No shared gallery with that id." } }
```

| Status | `code` | Meaning |
| --- | --- | --- |
| 400 | `bad_request` | Invalid parameter, e.g. an unknown `sort` |
| 401 | `unauthorized` | Missing, unknown or revoked key |
| 404 | `not_found` | Gallery or image is not shared with the portal (or does not exist) |
| 503 | `unavailable` | ImageBank cannot reach Dropbox right now; retry later |
| 5xx | | Unexpected; retry with backoff |

## Using the URLs

- **Signed image URLs last 1 hour.** It's fine to put `thumbUrl` / `previewUrl` straight into `<img src>` in the portal page. Don't store them in a database or cache them longer than about 50 minutes; fetch the gallery again instead.
- **Caching:** gallery responses can be cached on Horizon's server for up to 60 seconds (`Cache-Control: private, max-age=60`). Download responses must not be cached.
- **Volume:** keep to a few requests per second. Page large galleries with `limit` / `offset` rather than requesting everything at once.
- **Smart galleries** (saved searches) show their top 200 matches in the portal and update as new images are indexed.

## Example: Horizon server (Express)

A small client module plus three routes. Horizon's own portal authentication (`requirePortalCustomer` below) decides who may see anything.

```js
// lib/imagebank.mjs
const BASE = `${process.env.IMAGEBANK_URL}/api/v1/portal`;

async function call(path, { customerId } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.IMAGEBANK_API_KEY}`,
      ...(customerId ? { 'X-Portal-Customer': String(customerId) } : {}),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    const err = new Error(body?.error?.message ?? `ImageBank ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

const qs = (params) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();

export const listGalleries = ({ q, sort } = {}) => call(`/galleries?${qs({ q, sort })}`);
export const getGallery = (id, { offset = 0, limit = 60, q, sort, product } = {}) =>
  call(`/galleries/${encodeURIComponent(id)}?${qs({ offset, limit, q, sort, product })}`);
export const downloadLink = (versionId, customerId) =>
  call(`/images/${encodeURIComponent(versionId)}/download`, { customerId });
```

```js
// routes (inside Horizon's client portal router)
import { listGalleries, getGallery, downloadLink } from './lib/imagebank.mjs';

app.get('/portal/api/galleries', requirePortalCustomer, async (req, res) => {
  res.json(await listGalleries({ q: req.query.q, sort: req.query.sort }));
});

app.get('/portal/api/galleries/:id', requirePortalCustomer, async (req, res) => {
  try {
    const { offset, q, sort, product } = req.query;
    res.json(await getGallery(req.params.id, { offset: Number(offset) || 0, q, sort, product }));
  } catch (e) {
    res.status(e.status === 404 ? 404 : 502).json({ error: 'Gallery unavailable' });
  }
});

// The customer clicks Download: get a fresh link and send them straight to it.
app.get('/portal/download/:versionId', requirePortalCustomer, async (req, res) => {
  try {
    const { url } = await downloadLink(req.params.versionId, req.portalCustomer.id);
    res.redirect(302, url);
  } catch (e) {
    res.status(e.status === 404 ? 404 : 502).send('Download unavailable');
  }
});
```

## What to build in the portal (HORIZON UI kit)

The goal: wholesale customers browse shared image collections, with **search**, **sort** and **download**.

**1. Galleries page**
- A card grid: cover image, title, image count, shared date (dd-mmm-yy).
- A search box (sends `q`, debounced about 300 ms) and a sort menu: *Recently shared* (`shared`), *Name A to Z* (`name`), *Recently updated* (`updated`).
- Empty state: "No galleries have been shared yet." With a search: "No galleries match "…"."

**2. Gallery page**
- Header: title, description, image count (`page.total`).
- A search box (`q`) and a sort menu: *Dock & Bay order* (`gallery`, default), *Newest*, *Oldest*, *Name A to Z*.
- Optional product filter (`product`) for links from product pages.
- An image grid of `thumbUrl`s with infinite scroll: request the next page with the same `q` / `sort` / `product` and `offset = page.nextOffset` until it is `null`.
- Keep `q` and `sort` in the portal's own URL (e.g. `/portal/galleries/{id}?q=beach&sort=newest`) so customers can share and reload a view.
- With a search and no results: "No images match "…" in this gallery." and a *Clear search* link.

**3. Image view (lightbox)**
- `previewUrl` large, the filename or title, capture date, and linked products (code, name, colourway).
- A **Download** menu listing `versions` (label, format, pixel size, file size; default first). Picking one calls the portal's own download route, which asks ImageBank for a fresh link and redirects (see the example above).

**4. Download**
- One file per click, always fetched fresh from `/images/{versionId}/download` with `X-Portal-Customer`.
- Several at once (optional): let customers tick images and download the default version of each, one after another through the same route. A zip of a whole gallery isn't in the API yet; ask ImageBank if needed.

**5. Product pages (optional)**
- Call the gallery endpoint with `product=<code>` to show that product's images from shared galleries.

## Security checklist

- [ ] `IMAGEBANK_API_KEY` only in server-side environment variables; never in client bundles, URLs or logs
- [ ] Every portal route checks the customer is signed in to Horizon before calling ImageBank
- [ ] Download links are fetched on click and not stored
- [ ] `X-Portal-Customer` carries Horizon's customer id, not an email address
- [ ] Revoke and replace the key in ImageBank if it may have leaked

## Versioning

The API is under `/api/v1/`. ImageBank may add fields without notice; Horizon should ignore fields it does not know. Removing or renaming a field means a new version (`/api/v2/`), with notice.

## Not in v1

- Zip downloads of a whole gallery (the ImageBank app has them; the API could add a "download several" endpoint later).
- Search across all shared galleries at once (search works inside one gallery; the `product` filter covers product pages).
- Customer-specific galleries; every shared gallery is visible to every signed-in portal customer.
