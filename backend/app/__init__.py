# from flask import Flask
# from flask_cors import CORS
# from flask_session import Session
# from datetime import timedelta
# from .routes import main
# from .db import init_db

# def create_app():
#     app = Flask(__name__)

#     # ✅ Needed for session cookie
#     app.secret_key = "super-secret-key-change-this"

#     # ✅ Flask session config
#     app.config["SESSION_TYPE"] = "filesystem"
#     app.config["SESSION_PERMANENT"] = True
#     app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=8)

#     Session(app)

#     # ✅ CORS (allow cookies)
#     CORS(app, supports_credentials=True)

#     init_db()

#     app.register_blueprint(main, url_prefix="/api")
#     return app

from flask import Flask
from flask_cors import CORS
from flask_session import Session
from datetime import timedelta
from .routes import main
from .db import init_db

def create_app():
    app = Flask(__name__)

    # ✅ Required for session cookie
    app.secret_key = "change-this-to-a-strong-secret"

    # ✅ Flask Session Config
    app.config["SESSION_TYPE"] = "filesystem"
    app.config["SESSION_PERMANENT"] = True
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=8)

    # ✅ Step C: Cookie settings (important for login session)
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = False  # ✅ local http (not https)

    # ✅ Start sessions
    Session(app)

    # ✅ CORS allow frontend origin + cookies
    CORS(
        app,
        supports_credentials=True,
        origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ],
    )

    # ✅ auto create tables
    init_db()

    # ✅ API prefix
    app.register_blueprint(main, url_prefix="/api")

    return app
