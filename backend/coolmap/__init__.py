from pathlib import Path

from flask import Flask, send_from_directory
from flask_cors import CORS

from coolmap.blueprints.api import bp as api_bp


def create_app() -> Flask:
    root = Path(__file__).resolve().parents[2]
    frontend_dir = root / "frontend"

    app = Flask(
        __name__,
        static_folder=str(frontend_dir),
        static_url_path="",
    )
    app.config["JSON_SORT_KEYS"] = False
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.register_blueprint(api_bp)

    @app.route("/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    data_dir = root / "data"

    @app.route("/data/<path:filename>")
    def serve_data(filename):
        return send_from_directory(str(data_dir), filename)

    return app
