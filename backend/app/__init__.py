import logging
import os
from datetime import timedelta

from flask import Flask
from flask_cors import CORS
from flask_session import Session

from .db import init_db
from .extensions import mail
from .routes import main

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - fallback for environments without python-dotenv
    def load_dotenv(*args, **kwargs):
        return False

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)


def _get_bool_env(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_csv_env(name, default=""):
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


def create_app():
    load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

    app = Flask(__name__)

    if not logging.getLogger().handlers:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        )

    data_dir = os.getenv("DATA_DIR", os.path.join(BASE_DIR, "data"))
    os.makedirs(data_dir, exist_ok=True)

    app.secret_key = os.getenv("SECRET_KEY", "change-this-to-a-strong-secret")

    mail_username = os.getenv("MAIL_USERNAME", "").strip()
    admin_email = os.getenv("ADMIN_EMAIL", "").strip() or mail_username
    notification_cc = _get_csv_env(
        "NOTIFICATION_CC",
        "lavan8803@gmail.com",
    )
    app.config.update(
        MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.office365.com"),
        MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
        MAIL_USE_TLS=_get_bool_env("MAIL_USE_TLS", True),
        MAIL_USE_SSL=False,
        MAIL_USERNAME=mail_username,
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
        MAIL_DEFAULT_SENDER=mail_username or None,
        ADMIN_EMAIL=admin_email,
        NOTIFICATION_CC=notification_cc,
        COMPANY_NAME=os.getenv("COMPANY_NAME", "DTC INFOTECH PVT LTD").strip()
        or "DTC INFOTECH PVT LTD",
        SESSION_TYPE="filesystem",
        SESSION_FILE_DIR=os.path.join(data_dir, "sessions"),
        SESSION_PERMANENT=True,
        PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
        SESSION_USE_SIGNER=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=_get_bool_env("SESSION_COOKIE_SECURE", False),
        SESSION_COOKIE_HTTPONLY=True,
    )

    mail.init_app(app)
    os.makedirs(app.config["SESSION_FILE_DIR"], exist_ok=True)
    Session(app)
    CORS(
        app,
        supports_credentials=True,
        origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://192.168.0.0/16",
        ],
    )
    init_db()
    app.register_blueprint(main, url_prefix="/api")
    app.logger.info(
        "Application initialized with data dir %s and mail server %s:%s",
        data_dir,
        app.config["MAIL_SERVER"],
        app.config["MAIL_PORT"],
    )
    return app
