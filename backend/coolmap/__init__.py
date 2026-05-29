from flask import Flask, send_from_directory
from pathlib import Path

def create_app():
    app = Flask(
        __name__,
        static_folder="../../frontend",
        static_url_path=""
    )

    @app.route("/")
    def index():
        return send_from_directory(Path(__file__).resolve().parents[2] / "frontend", "index.html")

    return app
