import os
import traceback

import bcrypt
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from db import get_db_connection
from routes.auth import auth
from routes.admin import admin
from routes.client import client
from routes.department import department
from routes.staff import staff
from routes.workflow import workflow

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False
CORS(app, resources={r"/*": {"origins": "*"}})

BLUEPRINTS_LOADED = 0
for blueprint in (auth, admin, client, department, staff, workflow):
    app.register_blueprint(blueprint)
    BLUEPRINTS_LOADED += 1


def _execute_setup_statements(cursor, statements):
    for statement in statements:
        cursor.execute(statement)


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


@app.route("/")
def home():
    return jsonify({
        "status": "ok",
        "message": "Report Tracking System backend is running.",
        "blueprints_loaded": BLUEPRINTS_LOADED,
    })


@app.route("/health")
def health_check():
    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        return jsonify({"status": "ok", "database": "available"}), 200
    except Exception as exc:
        print(f"[HEALTH CHECK] Database unavailable: {exc}", flush=True)
        return jsonify({
            "status": "error",
            "database": "unavailable",
            "error": str(exc),
        }), 500
    finally:
        if db:
            db.close()


@app.route("/setup-db", methods=["GET", "POST", "OPTIONS"])
def setup_db():
    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()

        create_statements = [
            '''CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                signature_path VARCHAR(255)
            )''',
            '''CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                google_sub VARCHAR(255) UNIQUE,
                password VARCHAR(255) NOT NULL,
                temp_password VARCHAR(255),
                role VARCHAR(32) NOT NULL,
                department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL
            )''',
            '''CREATE TABLE IF NOT EXISTS reports (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255),
                description TEXT,
                client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
                requires_physical_pickup BOOLEAN DEFAULT FALSE,
                physical_pickup_info VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Pending',
                current_workflow_step INTEGER DEFAULT 1,
                total_workflow_steps INTEGER DEFAULT 1,
                budget NUMERIC(15,2) DEFAULT 0,
                budget_approved BOOLEAN DEFAULT FALSE,
                reassign_reason VARCHAR(255),
                attachment_path VARCHAR(255),
                client_email VARCHAR(255),
                client_name VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )''',
            '''CREATE TABLE IF NOT EXISTS report_workflow_routes (
                id SERIAL PRIMARY KEY,
                report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                step_number INTEGER NOT NULL,
                department_id INTEGER NOT NULL REFERENCES departments(id),
                assigned_user_id INTEGER REFERENCES users(id),
                status VARCHAR(50) DEFAULT 'Pending',
                approver_notes TEXT,
                assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                completed_date TIMESTAMP WITH TIME ZONE,
                UNIQUE(report_id, step_number)
            )''',
            '''CREATE TABLE IF NOT EXISTS report_logs (
                id SERIAL PRIMARY KEY,
                report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                old_department INTEGER REFERENCES departments(id),
                new_department INTEGER REFERENCES departments(id),
                updated_by INTEGER REFERENCES users(id),
                action VARCHAR(100),
                remarks TEXT,
                date_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )''',
        ]

        _execute_setup_statements(cursor, create_statements)

        department_names = [
            'Office of the Mayor',
            'Municipal Treasurer''s Office',
            'Municipal Assessor''s Office',
            'Municipal Budget Office',
            'Municipal Accountant''s Office',
            'Municipal Civil Registrar''s Office',
            'Municipal Engineer''s Office',
            'Municipal Planning and Development Office',
            'Municipal Health Office',
            'Municipal Social Welfare and Development Office',
            'Municipal Police Office',
            'Bureau of Fire Protection',
            'Municipal Agricultural Office',
            'Municipal Environment and Natural Resources Office',
            'Municipal Tourism Office',
            'Municipal General Services Office',
            'Municipal Legal Office',
            'Municipal Information and Communications Technology Office',
            'Municipal Business Permits and Licensing Office',
        ]

        for department_name in department_names:
            cursor.execute(
                'INSERT INTO departments (name) VALUES (%s) ON CONFLICT (name) DO NOTHING',
                (department_name,),
            )

        admin_email = os.environ.get('ADMIN_EMAIL', 'admin@municipal.gov')
        admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        admin_name = os.environ.get('ADMIN_NAME', 'System Administrator')

        cursor.execute(
            'INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s) ON CONFLICT (email) DO NOTHING',
            (admin_name, admin_email, _hash_password(admin_password), 'admin'),
        )

        db.commit()
        cursor.close()

        return jsonify({
            'status': 'ok',
            'message': 'Database setup completed successfully.',
            'admin_email': admin_email,
            'admin_password': admin_password,
        }), 200
    except Exception as exc:
        if db:
            db.rollback()
        print(f"[SETUP DB ERROR] {type(exc).__name__}: {exc}", flush=True)
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': 'Database setup failed.',
            'error': str(exc),
        }), 500
    finally:
        if db:
            db.close()


@app.errorhandler(Exception)
def handle_exception(error):
    if isinstance(error, HTTPException):
        return error
    print(f"[UNHANDLED ERROR] {type(error).__name__}: {error}", flush=True)
    traceback.print_exc()
    return jsonify({'message': 'Internal server error', 'error': str(error)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    debug_mode = os.environ.get('FLASK_ENV', 'production') != 'production'
    print(f"[STARTUP] Starting Flask app on 0.0.0.0:{port} (debug={debug_mode})", flush=True)
    print('[STARTUP] Flask app ready to accept requests', flush=True)
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
