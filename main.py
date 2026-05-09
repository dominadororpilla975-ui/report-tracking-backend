import os
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS

# Load .env values into os.environ when running locally.
# This ensures EMAIL and DB settings from backend/.env are available.

def load_local_env():
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        print(f"[ENV LOADER] .env file not found at {env_path}")
        return

    print(f"[ENV LOADER] Loading .env file from {env_path}")
    with env_path.open("r", encoding="utf-8") as f:
        count = 0
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
                print(f"[ENV LOADER] Set {key}={value if key not in ['GMAIL_APP_PASSWORD', 'BREVO_API_KEY', 'SMTP_PASSWORD'] else '***'}")
                count += 1
    print(f"[ENV LOADER] Loaded {count} environment variables")

load_local_env()

from routes.auth import auth
from routes.admin import admin
from routes.client import client
from routes.staff import staff
from routes.department import department
from routes.workflow import workflow

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Register blueprints
app.register_blueprint(auth)
app.register_blueprint(admin)
app.register_blueprint(client)
app.register_blueprint(staff)
app.register_blueprint(department)
app.register_blueprint(workflow)


@app.route('/login')
def login_redirect():
    from flask import redirect
    from config import build_frontend_url
    return redirect(build_frontend_url("login"), code=302)


@app.route('/health')
def health():
    return jsonify({"status": "ok"}), 200


@app.errorhandler(404)
def not_found(error):
    from flask import jsonify
    return jsonify({"message": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(error):
    from flask import jsonify
    return jsonify({"message": "Server error"}), 500

if __name__ == "__main__":
    # Bind to all local interfaces so the frontend can reach the backend reliably
    app.run(debug=True, host="0.0.0.0", port=5000)
