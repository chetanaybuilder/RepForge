import os
from backend.app import create_app

# This file exists in the root directory to satisfy Render's default
# Python start command: `gunicorn app:app`
# It will simply instantiate the application from our backend package.
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
