"""Web server for the Whiteboard add-on.

Serves the bundled Excalidraw frontend and a minimal scene persistence
API. Home Assistant's ingress proxy strips its path prefix before
forwarding, so this server only ever sees plain paths like /api/scene.

Scene data is a single JSON document stored in the add-on's persistent
/data volume. Last write wins; there is no merge or live collaboration.
"""

import json
import os
import pathlib
import tempfile
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

WWW_DIR = pathlib.Path(__file__).parent / "www"
DATA_DIR = pathlib.Path(os.environ.get("DATA_DIR", "/data"))
SCENE_FILE = DATA_DIR / "scene.json"
PORT = int(os.environ.get("PORT", "8099"))

# A generous cap: scenes with many embedded images can get large.
MAX_SCENE_BYTES = 50 * 1024 * 1024


class WhiteboardHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WWW_DIR), **kwargs)

    def _route(self):
        return self.path.split("?", 1)[0]

    def do_GET(self):
        if self._route() == "/api/scene":
            self._send_scene()
        else:
            super().do_GET()

    def do_POST(self):
        if self._route() != "/api/scene":
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_SCENE_BYTES:
            self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
            return

        body = self.rfile.read(length)
        try:
            json.loads(body)
        except ValueError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Body is not valid JSON")
            return

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        # Write-then-rename so a crash mid-write can't corrupt the scene.
        fd, tmp_path = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")
        try:
            with os.fdopen(fd, "wb") as tmp:
                tmp.write(body)
            os.replace(tmp_path, SCENE_FILE)
        except OSError:
            os.unlink(tmp_path)
            raise

        self._send_json(b'{"ok": true}')

    def _send_scene(self):
        body = SCENE_FILE.read_bytes() if SCENE_FILE.exists() else b"null"
        self._send_json(body)

    def _send_json(self, body):
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), WhiteboardHandler)
    print(f"Whiteboard server listening on :{PORT}, data in {DATA_DIR}")
    server.serve_forever()


if __name__ == "__main__":
    main()
