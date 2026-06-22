#!/usr/bin/env python3
"""Mirror location photos into the repo so they load instantly (same-origin).

Runs in the refresh workflow, AFTER fetch_sheet.py. For each row in
data/locations.csv whose photo_url is a Google Drive link, it downloads and
optimizes the image to images/locations/<id>.jpg and rewrites that row's
photo_url to the local path. Editors keep pasting Drive links in the sheet;
this just copies them into the repo and points the site at the local copy, so
the browser loads photos from the city CDN instead of slow lh3.googleusercontent.

A manifest (images/locations/manifest.json) records the Drive id per location,
so unchanged photos are not re-downloaded and removed locations are pruned.
Anything that can't be fetched keeps its original URL (graceful fallback).
"""
import csv
import io
import json
import os
import re
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

try:
    from PIL import Image
    HAVE_PIL = True
except ImportError:                       # still works without Pillow (no resize)
    HAVE_PIL = False

LOCATIONS = "data/locations.csv"
IMG_DIR   = "images/locations"
MANIFEST  = os.path.join(IMG_DIR, "manifest.json")
MAX_W     = 1200                          # downscale huge originals
JPEG_Q    = 82                            # visually lossless, small files
SCOPES    = ["https://www.googleapis.com/auth/drive.readonly"]


def drive_id(url):
    """Extract a Google Drive file id from any of the link shapes editors paste."""
    for pat in (r"drive\.google\.com/file/d/([^/?]+)",
                r"lh3\.googleusercontent\.com/d/([^=/?]+)",
                r"[?&]id=([^&]+)"):
        m = re.search(pat, url or "")
        if m:
            return m.group(1)
    return None


def slugify(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", (s or "").lower())).strip("-")


def drive_service():
    """Drive client authed as the service account (same key as fetch_sheet.py).
    The photos' Drive folder must be shared with the service-account email."""
    raw = os.environ["GOOGLE_SERVICE_ACCOUNT_KEY"]
    info = json.loads(raw) if raw.lstrip().startswith("{") else json.load(open(raw))
    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def fetch(svc, file_id):
    """Download a Drive file's bytes via the API (works for private files)."""
    buf = io.BytesIO()
    dl = MediaIoBaseDownload(buf, svc.files().get_media(fileId=file_id))
    done = False
    while not done:
        _, done = dl.next_chunk()
    return buf.getvalue()


def save_image(data, path):
    if HAVE_PIL:
        im = Image.open(io.BytesIO(data))
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)))
        im.save(path, "JPEG", quality=JPEG_Q, optimize=True)
    else:
        with open(path, "wb") as f:
            f.write(data)


def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    manifest = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    svc = drive_service()

    with open(LOCATIONS, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    new_manifest, downloaded = {}, 0
    for row in rows:
        rid = (row.get("id") or "").strip() or slugify(row.get("name"))
        did = drive_id((row.get("photo_url") or "").strip())
        if not rid or not did:
            continue                      # no photo / not a Drive link — leave as-is
        file_rel = f"{IMG_DIR}/{rid}.jpg"
        prev = manifest.get(rid)
        if prev and prev.get("src") == did and os.path.exists(file_rel):
            new_manifest[rid] = prev      # unchanged → reuse the committed image
        else:
            try:
                save_image(fetch(svc, did), file_rel)
                new_manifest[rid] = {"src": did, "file": file_rel}
                downloaded += 1
                print(f"  fetched {rid}")
            except Exception as e:
                print(f"  WARN {rid}: {e} — keeping original URL")
                continue                  # don't rewrite; site falls back to the Drive URL
        row["photo_url"] = file_rel       # point the site at the local copy

    with open(LOCATIONS, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n", extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    # Prune images for locations that no longer reference them.
    keep = {m["file"] for m in new_manifest.values()}
    for fn in os.listdir(IMG_DIR):
        p = f"{IMG_DIR}/{fn}"
        if fn.endswith(".jpg") and p not in keep:
            os.remove(p)
            print(f"  pruned stale {p}")

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(new_manifest, f, indent=2, sort_keys=True)
        f.write("\n")

    print(f"Photos: {len(new_manifest)} referenced, {downloaded} (re)downloaded. PIL={HAVE_PIL}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
