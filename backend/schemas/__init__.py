# Schemas subdirectory for organizing payment-related schemas
# The package also re-exports classes from the root schemas.py module
# so existing imports like `from schemas import LogAuditoriaCreate` continue working.

from .payments import *

import importlib.util
import sys
from pathlib import Path

_root_schemas_path = Path(__file__).resolve().parent.parent / "schemas.py"
if _root_schemas_path.exists():
    _spec = importlib.util.spec_from_file_location("schemas_root", str(_root_schemas_path))
    if _spec and _spec.loader:
        _root_schemas = importlib.util.module_from_spec(_spec)
        sys.modules[_spec.name] = _root_schemas
        _spec.loader.exec_module(_root_schemas)
        for _name in dir(_root_schemas):
            if not _name.startswith("_"):
                globals()[_name] = getattr(_root_schemas, _name)

