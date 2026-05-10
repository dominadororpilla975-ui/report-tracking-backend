import os
import secrets
import string
import traceback
from datetime import datetime, timedelta
from functools import wraps

import bcrypt
from flask import Blueprint, request, jsonify, g
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from db import get_db

# Google authentication (lazy import to avoid warnings)
_google_requests = None
_google_id_token = None
_google_auth_checked = False

def _ensure_google_imports():
    global _google_requests, _google_id_token, _google_auth_checked
    if _google_auth_checked:
        return _google_requests is not None

    _google_auth_checked = True
    try:
        import google.auth.transport.requests as _google_requests
        import google.oauth2.id_token as _google_id_token
        return True
    except ImportError:
        return False

GOOGLE_AUTH_AVAILABLE = _ensure_google_imports()

# Set up the imports for use
if GOOGLE_AUTH_AVAILABLE:
    google_requests = _google_requests
    google_id_token = _google_id_token
else:
    google_requests = None
    google_id_token = None

SECRET_KEY = os.environ.get("SECRET_KEY", "change_me_secret_key")
TOKEN_MAX_AGE = int(os.environ.get("TOKEN_MAX_AGE", 28800))  # 8 hours by default
serializer = URLSafeTimedSerializer(SECRET_KEY, salt="auth-token")


def get_google_client_ids():
    client_ids = []

    primary_client_id = os.environ.get(
        "GOOGLE_CLIENT_ID",
        os.environ.get("REACT_APP_GOOGLE_CLIENT_ID", ""),
    ).strip()
    if primary_client_id:
        client_ids.append(primary_client_id)

    extra_client_ids = os.environ.get("GOOGLE_CLIENT_IDS", "").strip()
    if extra_client_ids:
        client_ids.extend(
            client_id.strip()
            for client_id in extra_client_ids.split(",")
            if client_id.strip()
        )

    # Preserve order while removing duplicates.
    return list(dict.fromkeys(client_ids))


def generate_auth_token(payload):
    return serializer.dumps(payload)


def verify_auth_token(token):
    try:
        return serializer.loads(token, max_age=TOKEN_MAX_AGE)
    except (SignatureExpired, BadSignature):
        return None


def auth_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"message": "Authorization token required"}), 401

        token = auth_header.split(" ", 1)[1].strip()
        user = verify_auth_token(token)
        if not user:
            return jsonify({"message": "Invalid or expired token"}), 401

        g.user = user
        return f(*args, **kwargs)

    return wrapper


def verify_google_token(id_token):
    if not id_token:
        raise ValueError("Google ID token is required")

    if not GOOGLE_AUTH_AVAILABLE:
        raise RuntimeError(
            "Google sign-in dependency is missing. Install backend requirements first."
        )

    allowed_client_ids = get_google_client_ids()
    if not allowed_client_ids:
        raise ValueError("Google sign-in is not configured on the server")

    try:
        request_adapter = google_requests.Request()
        payload = google_id_token.verify_oauth2_token(id_token, request_adapter)
    except Exception as err:
        raise ValueError(f"Unable to verify Google token: {err}")

    if payload.get("aud") not in allowed_client_ids:
        raise ValueError("Google token audience does not match")

    if payload.get("iss") not in (
        "accounts.google.com",
        "https://accounts.google.com",
    ):
        raise ValueError("Google token issuer is invalid")

    email_verified = payload.get("email_verified")
    if email_verified not in ("true", True, "True"):
        raise ValueError("Google account email is not verified")

    return payload


def get_department_name(db, department_id):
    if not department_id:
        return None

    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT name FROM departments WHERE id=%s", (department_id,))
        department = cursor.fetchone()
        cursor.close()
        if department:
            return department.get("name")
    except Exception:
        return None

    return None


def build_auth_response(db, user):
    department_name = get_department_name(db, user.get("department_id"))
    token_payload = {
        "id": user["id"],
        "role": user["role"],
        "name": user["name"],
        "email": user["email"],
        "department_id": user.get("department_id"),
    }
    token = generate_auth_token(token_payload)

    return {
        "id": user["id"],
        "role": user["role"],
        "name": user["name"],
        "email": user["email"],
        "departmentId": user.get("department_id"),
        "departmentName": department_name,
        "token": token,
        "needsPasswordChange": bool(user.get("needs_password_change")),
    }


def admin_required(f):
    @wraps(f)
    @auth_required
    def wrapper(*args, **kwargs):
        if g.user.get("role") != "admin":
            return jsonify({"message": "Admin privileges required"}), 403
        return f(*args, **kwargs)

    return wrapper


auth = Blueprint("auth", __name__)

# Add OPTIONS handler for CORS preflight
@auth.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return '', 204


@auth.route('/register', methods=['POST', 'OPTIONS'])
def register():
    return jsonify({
        "message": (
            "Public registration is disabled. Please ask the administrator "
            "to create your account."
        )
    }), 403


@auth.route('/google-login', methods=['POST', 'OPTIONS'])
def google_login():
    db = None
    try:
        data = request.get_json(silent=True) or {}
        id_token = data.get("id_token")
        if not id_token:
            return jsonify({"message": "Google ID token is required"}), 400

        try:
            payload = verify_google_token(id_token)
        except ValueError as err:
            return jsonify({"message": str(err)}), 401
        except RuntimeError as err:
            return jsonify({"message": str(err)}), 500

        email = payload.get("email")
        google_sub = payload.get("sub")
        if not email:
            return jsonify({"message": "Google token did not provide an email"}), 400
        if not google_sub:
            return jsonify({
                "message": "Google token did not provide an account identifier"
            }), 400

        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM users WHERE google_sub=%s", (google_sub,))
        user = cursor.fetchone()

        if not user:
            cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
            user = cursor.fetchone()

            if user:
                if user.get("google_sub") and user.get("google_sub") != google_sub:
                    cursor.close()
                    return jsonify({
                        "message": "This email is already linked to a different Google account"
                    }), 409

                cursor.execute(
                    "UPDATE users SET google_sub = %s WHERE id = %s",
                    (google_sub, user["id"]),
                )
                db.commit()
                cursor.execute("SELECT * FROM users WHERE id=%s", (user["id"],))
                user = cursor.fetchone()

        cursor.close()

        if not user:
            return jsonify({
                "message": "No account is associated with this Google email"
            }), 404

        return jsonify(build_auth_response(db, user)), 200
    except Exception as e:
        print(f"[GOOGLE LOGIN ERROR] {e}")
        if db:
            db.rollback()
        return jsonify({"message": "Error during Google login"}), 500
    finally:
        if db:
            db.close()


@auth.route('/login', methods=['POST', 'OPTIONS'])
def login():
    db = None
    try:
        data = request.get_json(silent=True) or {}

        # Validate input
        if not data.get('email') or not data.get('password'):
            return jsonify({"message": "Email and password are required"}), 400

        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM users WHERE email=%s", (data["email"],))
        user = cursor.fetchone()
        cursor.close()
        
        if user:
            # Convert password to string if it's bytes
            stored_password = user.get("password", "")
            if isinstance(stored_password, bytes):
                stored_password = stored_password.decode('utf-8')
            
            stored_password = stored_password.strip() if stored_password else ""
            input_password = data.get("password", "").strip()

            # Debug logging
            print(
                f"[LOGIN] email={data.get('email')} "
                f"user_id={user.get('id')} "
                f"stored_hash_len={len(stored_password)} "
                f"input_len={len(input_password)}"
            )

            # Check password
            if stored_password and input_password:
                try:
                    if bcrypt.checkpw(input_password.encode(), stored_password.encode()):
                        return jsonify(build_auth_response(db, user)), 200
                except ValueError as ve:
                    print(f"[LOGIN BCRYPT ERROR] {ve}")
                    return jsonify({"message": "Invalid credentials"}), 401
                except Exception as e:
                    print(f"[LOGIN ERROR] {e}")
                    return jsonify({"message": "Authentication error"}), 401

        # User not found or password mismatch
        return jsonify({"message": "Invalid credentials"}), 401

    except Exception as e:
        print(f"[LOGIN EXCEPTION] {type(e).__name__}: {e}")
        print(traceback.format_exc())
        return jsonify({"message": "Error during login"}), 500
    finally:
        if db:
            db.close()


@auth.route('/change-password', methods=['POST'])
@auth_required
def change_password():
    """Change password - for users who logged in with temp password"""
    db = None
    try:
        data = request.get_json(silent=True) or {}
        new_password = data.get('newPassword')

        if not new_password or len(new_password) < 6:
            return jsonify({"message": "Password must be at least 6 characters"}), 400

        user_id = g.user.get("id")

        # Hash new password
        hashed = bcrypt.hashpw(
            new_password.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("utf-8")

        db = get_db()
        cursor = db.cursor()

        # Update password and clear the needs_password_change flag
        cursor.execute(
            "UPDATE users SET password = %s, needs_password_change = 0 WHERE id = %s",
            (hashed, user_id),
        )
        db.commit()
        cursor.close()

        return jsonify({"message": "Password changed successfully"}), 200
    except Exception as e:
        print(f"[CHANGE PASSWORD ERROR] {e}")
        if db:
            db.rollback()
        return jsonify({"message": "Error changing password"}), 500
    finally:
        if db:
            db.close()


@auth.route('/forgot-password', methods=['POST', 'OPTIONS'])
def forgot_password():
    """Generate a temporary password and reset token, then send them by email."""
    db = None
    try:
        data = request.get_json(silent=True) or {}
        email = data.get('email')

        if not email:
            return jsonify({"message": "Email is required"}), 400

        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id, name FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user:
            # For security, don't reveal if email exists
            return jsonify({"message": "If email exists, reset instructions will be sent"}), 200

        # Generate a temporary password for immediate login.
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
        hashed = bcrypt.hashpw(
            temp_password.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("utf-8")

        # Generate reset token (valid for 1 hour)
        reset_token = serializer.dumps({"user_id": user["id"], "action": "reset-password"})

        # Calculate expiry time (1 hour from now)
        expires = datetime.utcnow() + timedelta(hours=1)

        cursor.execute(
            """
            UPDATE users
            SET password = %s,
                temp_password = %s,
                needs_password_change = 1,
                reset_token = %s,
                reset_token_expires = %s
            WHERE id = %s
            """,
            (hashed, temp_password, reset_token, expires, user["id"]),
        )

        # Send reset email with both the temporary password and reset link.
        try:
            from email_service import send_generic_email
            from config import build_frontend_url
            reset_url = build_frontend_url(f"reset-password?token={reset_token}")
            html_content = f"""
            <h2>Password Reset Request</h2>
            <p>Hi {user['name']},</p>
            <p>Your temporary password is:</p>
            <p><strong>{temp_password}</strong></p>
            <p>Please log in and change this password immediately.</p>
            <p>You can also click the link below to set a new password directly. This link expires in 1 hour.</p>
            <p><a href="{reset_url}">Reset Password</a></p>
            <p>If you didn't request this, ignore this email.</p>
            """
            text_content = (
                f"Hi {user['name']},\n\n"
                f"Your temporary password is: {temp_password}\n\n"
                "Please log in and change this password immediately.\n\n"
                f"You can also reset your password directly here: {reset_url}\n"
                "This link expires in 1 hour.\n"
            )
            
            send_generic_email(
                to_email=email,
                subject="Password Reset Request",
                html_content=html_content,
                text_content=text_content,
                recipient_name=user["name"],
            )
            db.commit()
        except Exception as mail_err:
            db.rollback()
            print(
                f"[FORGOT PASSWORD EMAIL] Failed to send reset email to "
                f"{email}: {mail_err}"
            )
            return jsonify({"message": "Unable to send reset instructions"}), 500

        cursor.close()
        return jsonify({"message": "If email exists, reset instructions will be sent"}), 200
    except Exception as e:
        print(f"[FORGOT PASSWORD ERROR] {e}")
        if db:
            db.rollback()
        return jsonify({"message": "Error processing request"}), 500
    finally:
        if db:
            db.close()


@auth.route('/reset-password', methods=['POST', 'OPTIONS'])
def reset_password():
    """Reset password using token from email"""
    db = None
    try:
        data = request.get_json(silent=True) or {}
        token = data.get('token')
        new_password = data.get('newPassword')

        if not token or not new_password:
            return jsonify({"message": "Token and password are required"}), 400

        if len(new_password) < 6:
            return jsonify({"message": "Password must be at least 6 characters"}), 400

        # Verify token
        try:
            payload = serializer.loads(token, max_age=3600)  # 1 hour max age
        except (SignatureExpired, BadSignature):
            return jsonify({"message": "Invalid or expired reset token"}), 401

        user_id = payload.get("user_id")

        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Verify token is still valid in database
        cursor.execute(
            "SELECT reset_token, reset_token_expires FROM users WHERE id = %s",
            (user_id,),
        )
        user = cursor.fetchone()

        if not user or user.get("reset_token") != token:
            return jsonify({"message": "Invalid reset token"}), 401

        if (
            user.get("reset_token_expires")
            and datetime.fromisoformat(str(user["reset_token_expires"])) < datetime.utcnow()
        ):
            return jsonify({"message": "Reset token has expired"}), 401

        # Hash new password and update
        hashed = bcrypt.hashpw(
            new_password.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("utf-8")

        cursor.execute(
            """
            UPDATE users
            SET password = %s,
                temp_password = NULL,
                needs_password_change = 0,
                reset_token = NULL,
                reset_token_expires = NULL
            WHERE id = %s
            """,
            (hashed, user_id),
        )
        db.commit()
        cursor.close()

        return jsonify({"message": "Password reset successfully"}), 200
    except Exception as e:
        print(f"[RESET PASSWORD ERROR] {e}")
        if db:
            db.rollback()
        return jsonify({"message": "Error resetting password"}), 500
    finally:
        if db:
            db.close()
