import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

print("[STARTUP] Flask app initialized")
print(f"[STARTUP] Environment: PORT={os.environ.get('PORT', 'NOT SET')}, DEBUG={app.debug}")

# -----------------------
# SAFE ROUTE IMPORTS
# -----------------------
BLUEPRINTS_LOADED = 0
try:
    from routes.auth import auth
    from routes.admin import admin
    from routes.client import client
    from routes.staff import staff
    from routes.department import department
    from routes.workflow import workflow

    app.register_blueprint(auth)
    app.register_blueprint(admin)
    app.register_blueprint(client)
    app.register_blueprint(staff)
    app.register_blueprint(department)
    app.register_blueprint(workflow)
    BLUEPRINTS_LOADED = 6
    print("[STARTUP] ✓ All 6 blueprints loaded successfully")

except Exception as e:
    print(f"[STARTUP] ⚠️ Blueprint import error: {type(e).__name__}: {e}", file=sys.stderr)
    print(f"[STARTUP] Continuing with core API endpoints only...")

# -----------------------
# BASIC ROUTES
# -----------------------
@app.route("/")
def home():
    return "API is running"

@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200

# -----------------------
# SAFE LOGIN REDIRECT
# -----------------------
@app.route('/login')
def login_redirect():
    try:
        from flask import redirect
        from config import build_frontend_url
        return redirect(build_frontend_url("login"), code=302)
    except Exception:
        return jsonify({"message": "login redirect failed"}), 500

# -----------------------
# ERROR HANDLERS
# -----------------------
@app.errorhandler(404)
def not_found(error):
    return jsonify({"message": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({"message": "Server error"}), 500

# -----------------------
# RENDER ENTRY POINT
# -----------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_ENV", "production") != "production"
    print(f"[STARTUP] Starting Flask app on 0.0.0.0:{port} (debug={debug_mode})")
    app.run(host="0.0.0.0", port=port, debug=debug_mode)