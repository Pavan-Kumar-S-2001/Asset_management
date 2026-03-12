from flask import Flask
from flask_cors import CORS
from flask_session import Session
from .extensions import mail
from datetime import timedelta
from .routes import main
from .db import init_db
import os


def create_app():
    app = Flask(__name__)

    app.secret_key = "change-this-to-a-strong-secret"

    DATA_DIR = "/app/data"
    os.makedirs(DATA_DIR, exist_ok=True)

    app.config["MAIL_SERVER"] = "smtp.office365.com"
    app.config["MAIL_PORT"] = 587
    app.config["MAIL_USE_TLS"] = True
    app.config["MAIL_USE_SSL"] = False
    app.config["MAIL_USERNAME"] = "it@dtcinfotech.com"
    app.config["MAIL_PASSWORD"] = ""
    app.config["MAIL_DEFAULT_SENDER"] = "it@dtcinfotech.com"

    mail.init_app(app)

    app.config["SESSION_TYPE"] = "filesystem"
    app.config["SESSION_FILE_DIR"] = os.path.join(DATA_DIR, "sessions")
    app.config["SESSION_PERMANENT"] = True
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=8)
    app.config["SESSION_USE_SIGNER"] = True

    os.makedirs(app.config["SESSION_FILE_DIR"], exist_ok=True)

    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = False
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    Session(app)
    CORS(
        app,
        supports_credentials=True,
        origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
    )
    init_db()
    app.register_blueprint(main, url_prefix="/api")
    return app