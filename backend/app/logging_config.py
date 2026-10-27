"""Logging setup.

Three places to look when something goes wrong:
  * console        -> `docker compose logs -f octo`
  * app.log        -> everything (requests, warnings, errors with stack traces)
  * error.log      -> only WARNING and above, so problems are easy to spot
Every line carries the request id of the HTTP request that produced it, so one
user action can be followed through the log (`grep a1b2c3d4 app.log`).
"""

import contextvars
import logging
import logging.config

from . import config

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def setup_logging() -> None:
    fmt = "%(asctime)s %(levelname)-7s [%(request_id)s] %(name)s: %(message)s"
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "filters": {"request_id": {"()": RequestIdFilter}},
            "formatters": {"std": {"format": fmt}},
            "handlers": {
                "console": {"class": "logging.StreamHandler", "formatter": "std", "filters": ["request_id"]},
                "app_file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": str(config.LOG_DIR / "app.log"),
                    "maxBytes": 5_000_000,
                    "backupCount": 5,
                    "encoding": "utf-8",
                    "formatter": "std",
                    "filters": ["request_id"],
                },
                "error_file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": str(config.LOG_DIR / "error.log"),
                    "maxBytes": 5_000_000,
                    "backupCount": 5,
                    "encoding": "utf-8",
                    "level": "WARNING",
                    "formatter": "std",
                    "filters": ["request_id"],
                },
            },
            "root": {"level": config.LOG_LEVEL, "handlers": ["console", "app_file", "error_file"]},
            "loggers": {
                # We log every request ourselves (with timing + request id), so silence uvicorn's duplicate.
                "uvicorn.access": {"level": "WARNING"},
                "sqlalchemy.engine": {"level": "WARNING"},
            },
        }
    )
