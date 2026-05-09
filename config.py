import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def build_frontend_url(path: str = "") -> str:
    url = FRONTEND_URL
    if url.startswith("http://"):
        url = "https://" + url[len("http://"):]
    return f"{url}/{path.lstrip('/')}" if path else url

EMAIL_FROM = os.environ.get("EMAIL_FROM", "dominadororpilla975@gmail.com")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "Report Tracking System")
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")

GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", EMAIL_FROM)
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "True").lower() in ("1", "true", "yes")
SMTP_USE_SSL = os.environ.get("SMTP_USE_SSL", "False").lower() in ("1", "true", "yes")

if not SMTP_HOST and GMAIL_USER and GMAIL_APP_PASSWORD:
    SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
    SMTP_USER = os.environ.get("SMTP_USER", GMAIL_USER)
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", GMAIL_APP_PASSWORD)
    SMTP_FROM = os.environ.get("SMTP_FROM", GMAIL_USER)

# Ensure sender address matches authenticated Gmail account when using Gmail SMTP.
if not SMTP_FROM and GMAIL_USER:
    SMTP_FROM = GMAIL_USER

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

# Debug logging
print(f"[CONFIG] EMAIL_FROM={EMAIL_FROM}")
print(f"[CONFIG] GMAIL_USER={GMAIL_USER}")
print(f"[CONFIG] GMAIL_APP_PASSWORD={'*' * 5 if GMAIL_APP_PASSWORD else 'NOT SET'}")
print(f"[CONFIG] SMTP_HOST={SMTP_HOST}")
print(f"[CONFIG] SMTP_PORT={SMTP_PORT}")
print(f"[CONFIG] SMTP_USER={SMTP_USER}")
print(f"[CONFIG] SMTP_USE_TLS={SMTP_USE_TLS}")
print(f"[CONFIG] SMTP_USE_SSL={SMTP_USE_SSL}")
print(f"[CONFIG] BREVO_API_KEY={'SET' if BREVO_API_KEY else 'NOT SET'}")
