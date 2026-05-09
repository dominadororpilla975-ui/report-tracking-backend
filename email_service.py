import smtplib
import ssl
from email.message import EmailMessage
from config import (
    BREVO_API_KEY,
    BREVO_API_URL,
    EMAIL_FROM,
    BREVO_SENDER_NAME,
    build_frontend_url,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM,
    SMTP_USE_TLS,
    SMTP_USE_SSL,
)

try:
    import requests
    from requests.exceptions import RequestException
except ImportError:
    requests = None
    RequestException = Exception


def build_welcome_html(recipient_name: str, to_email: str, temp_password: str) -> str:
    login_url = build_frontend_url("login")
    recipient_name = recipient_name or to_email

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account Created</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 0 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#0d6efd;color:#ffffff;padding:28px 30px;">
              <h1 style="margin:0;font-size:24px;">Welcome to Report Tracking</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="font-size:16px;color:#333333;margin:0 0 18px;">Hello {recipient_name},</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;">Your client account has been created successfully. Use the details below to log in and track reports.</p>
              <table cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;">
                <tr>
                  <td style="background:#f1f4f8;padding:18px;border-radius:8px;">
                    <p style="margin:0 0 10px;font-weight:700;color:#0d6efd;">Account details</p>
                    <p style="margin:0;color:#333333;">Email: <strong>{to_email}</strong></p>
                    <p style="margin:6px 0 0;color:#333333;">Password: <strong>{temp_password}</strong></p>
                    <p style="margin:6px 0 0;color:#666666;font-size:14px;">This is a temporary password. Please change it after logging in.</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 18px;color:#333333;">Tap the button below to open the login page on your phone:</p>
              <p style="text-align:center; margin: 0 0 18px;">
                <a href="{login_url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;max-width:320px;padding:16px 24px;background:#0d6efd;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;">Login to your account</a>
              </p>
              <p style="margin:0 0 18px;color:#333333;word-break:break-all;">If the button does not work, copy and paste this link into your browser:<br /><a href="{login_url}" style="color:#0d6efd;word-break:break-all;">{login_url}</a></p>
              <p style="margin:24px 0 0;color:#6c757d;font-size:14px;">If you did not request this account, please contact your administrator immediately.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f1f4f8;padding:20px 30px;color:#6c757d;font-size:13px;">
              <p style="margin:0;">Report Tracking System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def build_text_content(recipient_name: str, to_email: str, temp_password: str) -> str:
    login_url = build_frontend_url("login")
    recipient_name = recipient_name or to_email

    return (
        f"Hello {recipient_name},\n\n"
        f"Your client account has been created successfully. Use the details below to login and track reports.\n\n"
        f"Email: {to_email}\n"
        f"Temporary password: {temp_password}\n\n"
        f"Login here: {login_url}\n\n"
        "If you did not request this account, please contact your administrator.\n"
    )


def build_assignment_html(
    recipient_name: str,
    report_title: str,
    department_name: str,
    report_link: str,
) -> str:
    recipient_name = recipient_name or "Client"
    return f"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>Your report has been assigned</title>
</head>
<body style=\"margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;\">
  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f4f6f9;padding:30px 0;\">
    <tr>
      <td align=\"center\">
        <table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 0 20px rgba(0,0,0,0.08);\">
          <tr>
            <td style=\"background:#0d6efd;color:#ffffff;padding:28px 30px;\">
              <h1 style=\"margin:0;font-size:24px;\">Your report has been assigned</h1>
            </td>
          </tr>
          <tr>
            <td style=\"padding:30px;\">
              <p style=\"font-size:16px;color:#333333;margin:0 0 18px;\">Hello {recipient_name},</p>
              <p style=\"font-size:16px;color:#333333;line-height:1.6;\">Your report <strong>\"{report_title}\"</strong> has been assigned to the <strong>{department_name}</strong> department.</p>
              <p style=\"font-size:16px;color:#333333;line-height:1.6;\">You can track the status by logging in and viewing your report.</p>
              <p style=\"text-align:center; margin: 24px 0;\">
                <a href=\"{report_link}\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"display:inline-block;padding:16px 24px;background:#0d6efd;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;\">View report status</a>
              </p>
              <p style=\"margin:0 0 18px;color:#333333;word-break:break-all;\">If the button does not work, copy and paste this link into your browser:<br /><a href=\"{report_link}\" style=\"color:#0d6efd;word-break:break-all;\">{report_link}</a></p>
              <p style=\"margin:24px 0 0;color:#6c757d;font-size:14px;\">If you have questions, contact your administrator.</p>
            </td>
          </tr>
          <tr>
            <td style=\"background:#f1f4f8;padding:20px 30px;color:#6c757d;font-size:13px;\">
              <p style=\"margin:0;\">Report Tracking System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def build_assignment_text_content(
    recipient_name: str,
    report_title: str,
    department_name: str,
    report_link: str,
) -> str:
    recipient_name = recipient_name or "Client"
    return (
        f"Hello {recipient_name},\n\n"
        f"Your report \"{report_title}\" has been assigned to the {department_name} department.\n\n"
        f"Track your report here: {report_link}\n\n"
        "If you have questions, please contact your administrator.\n"
    )


def send_assignment_email(
    to_email: str,
    recipient_name: str,
    report_title: str,
    department_name: str,
    report_link: str,
):
    subject = "Your report has been assigned"
    html_content = build_assignment_html(recipient_name, report_title, department_name, report_link)
    text_content = build_assignment_text_content(recipient_name, report_title, department_name, report_link)
    return send_generic_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        recipient_name=recipient_name,
    )


def send_brevo_email(to_email: str, subject: str, html_content: str, text_content: str, recipient_name: str = None):
    if not BREVO_API_KEY:
        if SMTP_HOST:
            return send_smtp_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                recipient_name=recipient_name,
            )
        raise ValueError("Missing BREVO_API_KEY in environment variables.")

    payload = {
        "sender": {
            "name": BREVO_SENDER_NAME,
            "email": EMAIL_FROM,
        },
        "to": [
            {
                "email": to_email,
                "name": recipient_name or to_email,
            }
        ],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": text_content,
    }

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY,
    }

    try:
        response = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=15)
        if not response.ok:
            error = ValueError(
                f"Brevo API error {response.status_code}: {response.text}"
            )
            if SMTP_HOST:
                print(f"[BREVO FALLBACK] {error}. Falling back to SMTP.")
                return send_smtp_email(
                    to_email=to_email,
                    subject=subject,
                    html_content=html_content,
                    text_content=text_content,
                    recipient_name=recipient_name,
                )
            raise error
        return {"success": True, "method": "Brevo", "message": "Email sent successfully."}
    except RequestException as err:
        if SMTP_HOST:
            print(f"[BREVO FALLBACK] Brevo API request failed: {err}. Falling back to SMTP.")
            return send_smtp_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                recipient_name=recipient_name,
            )
        raise ValueError(f"Brevo API request failed: {err}") from err


def send_email(to_email: str, temp_password: str, recipient_name: str = None):
    subject = "Your Report Tracking account is ready"
    html_content = build_welcome_html(recipient_name or to_email, to_email, temp_password)
    text_content = build_text_content(recipient_name or to_email, to_email, temp_password)

    print(f"[SEND_EMAIL] Starting email send to {to_email}")
    print(f"[SEND_EMAIL] SMTP_HOST={SMTP_HOST}, BREVO_API_KEY={'SET' if BREVO_API_KEY else 'NOT SET'}")
    
    if SMTP_HOST:
        print(f"[SEND_EMAIL] Using SMTP method")
        return send_smtp_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            recipient_name=recipient_name,
        )
    
    print(f"[SEND_EMAIL] Using Brevo method")
    return send_brevo_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        recipient_name=recipient_name,
    )


def send_generic_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str,
    recipient_name: str = None,
):
    if SMTP_HOST:
        return send_smtp_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            recipient_name=recipient_name,
        )
    return send_brevo_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        recipient_name=recipient_name,
    )


def send_smtp_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str,
    recipient_name: str = None,
):
    if not SMTP_HOST:
        raise ValueError("Missing SMTP_HOST in environment variables.")

    print(f"[SMTP] Attempting to send email to {to_email}")
    print(f"[SMTP] Config: HOST={SMTP_HOST}:{SMTP_PORT}, USER={SMTP_USER}, TLS={SMTP_USE_TLS}, SSL={SMTP_USE_SSL}")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = SMTP_FROM
    message["To"] = to_email
    message.set_content(text_content)
    message.add_alternative(html_content, subtype="html")

    context = ssl.create_default_context()
    try:
        if SMTP_USE_SSL:
            print(f"[SMTP] Connecting with SSL...")
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=15)
        else:
            print(f"[SMTP] Connecting with SMTP...")
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
            if SMTP_USE_TLS:
                print(f"[SMTP] Starting TLS...")
                server.starttls(context=context)

        if SMTP_USER:
            print(f"[SMTP] Logging in as {SMTP_USER}...")
            server.login(SMTP_USER, SMTP_PASSWORD)
        
        print(f"[SMTP] Sending message...")
        server.send_message(message)
        print(f"[SMTP] Email sent successfully to {to_email}")
        return {"success": True, "method": "SMTP", "message": "Email sent successfully."}
    except Exception as e:
        print(f"[SMTP] Error: {e}")
        import traceback
        print(traceback.format_exc())
        raise
    finally:
        try:
            server.quit()
        except:
            pass
