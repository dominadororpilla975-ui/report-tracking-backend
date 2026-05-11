import os
import bcrypt
import secrets
import string
from db import get_db, get_dict_cursor
from routes.admin import send_welcome_email

def create_client_account(email, name=None):
    """Create client account or return existing client_id. Sends welcome email. Returns (client_id, temp_password if new)"""
    db = get_db()
    cursor = get_dict_cursor(db)
    
    try:
        # Check if email already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing = cursor.fetchone()
        if existing:
            print(f"Client email {email} already exists, ID: {existing['id']}")
            return existing['id'], None, False
        
        # Generate temp password
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
        print(f"Generated temp password for {email}: {temp_password}")
        
        # Derive name if not provided
        if not name:
            name = email.split('@')[0].title().replace('.', ' ').replace('_', ' ')
        
        # Hash password
        hashed = bcrypt.hashpw(temp_password.encode("utf-8"), bcrypt.gensalt()).decode('utf-8')
        
        # Insert client user
        cursor.execute("""
            INSERT INTO users (name, email, password, temp_password, role, department_id, needs_password_change)
            VALUES (%s, %s, %s, %s, 'client', NULL, 1)
        """, (name, email, hashed, temp_password))
        
        db.commit()
        client_id = cursor.lastrowid
        
        email_sent = send_welcome_email(email, name, temp_password, 'client')
        if not email_sent:
            print(f"Email send failed for {email}")
        
        print(f"Created new client account ID {client_id} for {email}")
        return client_id, temp_password, email_sent
        
    except Exception as e:
        print(f"Error creating client {email}: {e}")
        db.rollback()
        raise
    finally:
        cursor.close()
        db.close()


def resend_welcome_email(email, name=None):
    db = get_db()
    cursor = get_dict_cursor(db)

    try:
        cursor.execute(
            "SELECT id, name FROM users WHERE email = %s AND role = 'client'",
            (email,),
        )
        user = cursor.fetchone()
        if not user:
            raise ValueError(f"Client account not found for {email}")

        if not name:
            name = user.get("name") or email.split("@")[0].title().replace('.', ' ').replace('_', ' ')

        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
        hashed = bcrypt.hashpw(temp_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        cursor.execute(
            "UPDATE users SET password = %s, temp_password = %s WHERE id = %s",
            (hashed, temp_password, user["id"]),
        )
        db.commit()

        email_sent = send_welcome_email(email, name, temp_password, 'client')
        if not email_sent:
            print(f"Resend email failed for {email}")

        return user["id"], temp_password, email_sent
    except Exception as e:
        print(f"Error resending welcome email for {email}: {e}")
        db.rollback()
        raise
    finally:
        cursor.close()
        db.close()

