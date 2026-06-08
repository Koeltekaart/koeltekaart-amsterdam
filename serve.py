#!/usr/bin/env python3
"""Local dev server with HTTP Range support.

The stock `python3 -m http.server` ignores Range requests, which breaks the
shade vector tiles (data/shade.pmtiles) — PMTiles fetches small byte ranges
out of the single file. This server adds Range support so local testing
matches how Azure Static Web Apps serves the site in production.

Usage:  python3 serve.py [port]   (default port 8008)
Then open http://localhost:8008/
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class RangeHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      ".geojson": "application/geo+json",
                      ".pmtiles": "application/octet-stream"}

    def send_head(self):
        rng = self.headers.get("Range")
        if rng is None:
            return super().send_head()

        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()  # let the base class 404/redirect

        try:
            unit, _, rangespec = rng.partition("=")
            start_s, _, end_s = rangespec.partition("-")
            size = os.path.getsize(path)
            if unit.strip() != "bytes":
                raise ValueError
            start = int(start_s) if start_s else 0
            end = int(end_s) if end_s else size - 1
            end = min(end, size - 1)
            if start > end:
                raise ValueError
        except ValueError:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{os.path.getsize(path)}")
            self.end_headers()
            return None

        f = open(path, "rb")
        f.seek(start)
        self._range = (start, end)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        rng = getattr(self, "_range", None)
        if rng is None:
            return super().copyfile(source, outputfile)
        start, end = rng
        remaining = end - start + 1
        while remaining > 0:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)
        self._range = None


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8008
    handler = partial(RangeHandler, directory=os.path.dirname(os.path.abspath(__file__)))
    with ThreadingHTTPServer(("", port), handler) as httpd:
        print(f"Serving (with Range support) on http://localhost:{port}/  — Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
