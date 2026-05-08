# from app import create_app

# app = create_app()

# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=5000, debug=True)

import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    debug_enabled = os.getenv("FLASK_DEBUG", "False").strip().lower() == "true"
    app.run(host="0.0.0.0", port=5000, debug=debug_enabled)
