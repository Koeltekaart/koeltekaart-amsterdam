import os
from pathlib import Path


def _default_data_root() -> Path:
    return Path(__file__).resolve().parents[2]


DATA_ROOT = Path(os.environ.get("COOLMAP_DATA_ROOT", _default_data_root()))
RAW_DIR  = DATA_ROOT / "data" / "raw"
DATA_DIR = DATA_ROOT / "data"
