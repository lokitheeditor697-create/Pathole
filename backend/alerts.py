"""
Alert System — Smart City Road-Defect Notification Engine
==========================================================
Sends instant alerts to municipal officials via:
  1. Telegram Bot  (FREE — no credit card, instant delivery)
  2. Email / Gmail SMTP  (FREE with Gmail App Password)
  3. WhatsApp via Twilio (Paid — optional)

Configure via environment variables or edit ALERT_CONFIG below.

HOW TO SET UP TELEGRAM BOT (5 minutes, free):
  Step 1: Open Telegram → search "@BotFather" → /newbot → copy the TOKEN
  Step 2: Open your new bot → send any message to it
  Step 3: Go to https://api.telegram.org/bot<TOKEN>/getUpdates → copy your chat_id
  Step 4: Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID below (or env vars)

HOW TO SET UP GMAIL SMTP (free):
  Step 1: Enable 2FA on your Gmail account
  Step 2: Go to Google Account → Security → App Passwords → Generate
  Step 3: Set GMAIL_USER and GMAIL_APP_PASSWORD below (or env vars)
"""

import os
import json
import smtplib
import threading
import requests as http_requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────────────
# ALERT CONFIGURATION  — Set these or use environment variables
# ─────────────────────────────────────────────────────────────────────────────
ALERT_CONFIG = {
    # Telegram Bot (recommended — free, instant)
    "telegram_enabled": bool(os.getenv("TELEGRAM_BOT_TOKEN")),
    "telegram_token":   os.getenv("TELEGRAM_BOT_TOKEN", ""),
    "telegram_chat_id": os.getenv("TELEGRAM_CHAT_ID", ""),

    # Gmail SMTP (free)
    "email_enabled":        bool(os.getenv("GMAIL_USER")),
    "gmail_user":           os.getenv("GMAIL_USER", ""),
    "gmail_app_password":   os.getenv("GMAIL_APP_PASSWORD", ""),
    "alert_recipients":     os.getenv("ALERT_RECIPIENTS", "").split(","),  # comma-separated email list

    # Alert trigger criteria: "MULTI_BUS_VERIFIED" (default), "HIGH_SEVERITY", "ALL_VERIFIED", or "CRITICAL_ONLY"
    "trigger_criteria": os.getenv("ALERT_TRIGGER_CRITERIA", "MULTI_BUS_VERIFIED").upper(),

    # Alert thresholds
    "alert_on_new_high":      os.getenv("ALERT_TRIGGER_CRITERIA", "MULTI_BUS_VERIFIED").upper() in ["HIGH_SEVERITY", "ALL_VERIFIED"],
    "alert_on_multi_bus":     os.getenv("ALERT_TRIGGER_CRITERIA", "MULTI_BUS_VERIFIED").upper() in ["MULTI_BUS_VERIFIED", "HIGH_SEVERITY", "ALL_VERIFIED"],
    "alert_on_4bus_verified": True,   # Extra urgent alert when all buses confirm
}

# Track which defect IDs we've already alerted on (avoid duplicate alerts)
_alerted_defect_ids: set = set()
_alerted_multiverified_ids: set = set()


def _google_maps_link(lat: float, lon: float) -> str:
    return f"https://www.google.com/maps?q={lat},{lon}"


def _format_telegram_message(defect: dict, alert_type: str) -> str:
    """Format a rich Telegram markdown alert message."""
    lat = defect.get("latitude", 0)
    lon = defect.get("longitude", 0)
    severity = defect.get("severity", "Unknown")
    bus_count = defect.get("bus_count", 1)
    bus_ids = defect.get("bus_ids", "")
    confidence = defect.get("confidence", 0)
    defect_id = defect.get("id", "?")
    defect_type = defect.get("defect_type", "pothole").upper()
    maps_link = _google_maps_link(lat, lon)

    severity_emoji = {"High": "🔴", "Medium": "🟠", "Low": "🟡"}.get(severity, "⚪")
    alert_emoji = "🚨" if bus_count >= 2 else "⚠️"

    if alert_type == "multi_bus":
        headline = f"{alert_emoji} MULTI-BUS VERIFIED POTHOLE — {severity_emoji} {severity} SEVERITY"
        action = (
            "✅ *ACTION REQUIRED: Dispatch Asphalt Repair Crew within 24 hours*"
            if severity == "High" else
            "📋 *ACTION: Schedule maintenance within 72 hours*"
        )
    elif alert_type == "4bus_verified":
        headline = f"🚨🚨 ALL 4 BUSES CONFIRMED — CRITICAL ROAD DEFECT 🚨🚨"
        action = "🔴 *URGENT: Immediate Dispatch Required — High-Risk Zone*"
    else:
        headline = f"⚠️ NEW {defect_type} DETECTED — {severity_emoji} {severity}"
        action = "👁️ *STATUS: Pending cross-bus verification*"

    timestamp_now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    return f"""
{headline}

📍 *Location:* [{lat:.5f}, {lon:.5f}]({maps_link})
🗓️ *Detected:* {timestamp_now}
🆔 *Incident ID:* #{defect_id}
📊 *Confidence:* {confidence * 100:.0f}%
{severity_emoji} *Severity:* {severity}
🚌 *Confirmed by {bus_count} bus(es):* `{bus_ids}`

{action}

📌 *View on Map:* [Google Maps Link]({maps_link})
🏙️ *System:* Smart City Road-Defect Monitor — Chennai MTC
""".strip()


def _format_email_body(defect: dict, alert_type: str) -> tuple:
    """Returns (subject, html_body) for email alert."""
    lat = defect.get("latitude", 0)
    lon = defect.get("longitude", 0)
    severity = defect.get("severity", "Unknown")
    bus_count = defect.get("bus_count", 1)
    bus_ids = defect.get("bus_ids", "")
    confidence = defect.get("confidence", 0)
    defect_id = defect.get("id", "?")
    maps_link = _google_maps_link(lat, lon)
    timestamp_now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    if alert_type == "multi_bus":
        subject = f"[ROAD ALERT] Multi-Bus Verified Pothole #{defect_id} — {severity} Severity"
        action_text = "Dispatch Asphalt Repair Crew within 24 hours" if severity == "High" else "Schedule maintenance within 72 hours"
        header_color = "#dc2626" if severity == "High" else "#f59e0b"
    elif alert_type == "4bus_verified":
        subject = f"[CRITICAL] ALL 4 Buses Confirmed Pothole #{defect_id} — URGENT ACTION REQUIRED"
        action_text = "IMMEDIATE Dispatch Required — High-Risk Zone"
        header_color = "#7f1d1d"
    else:
        subject = f"[ROAD ALERT] New Pothole Detected #{defect_id} — {severity} Severity"
        action_text = "Pending secondary bus verification"
        header_color = "#78350f"

    html_body = f"""
    <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background:{header_color};color:white;padding:20px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:20px;">🚨 Road Defect Alert — Chennai Smart City System</h1>
        <p style="margin:5px 0 0 0;opacity:0.9;">Incident #{defect_id} · {timestamp_now}</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px;border-bottom:1px solid #f3f4f6;color:#6b7280;width:40%">📍 Location</td>
              <td style="padding:8px;border-bottom:1px solid #f3f4f6;font-weight:bold;">
                <a href="{maps_link}">{lat:.6f}, {lon:.6f}</a></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #f3f4f6;color:#6b7280">⚡ Severity</td>
              <td style="padding:8px;border-bottom:1px solid #f3f4f6;font-weight:bold;color:{header_color}">{severity}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #f3f4f6;color:#6b7280">📊 AI Confidence</td>
              <td style="padding:8px;border-bottom:1px solid #f3f4f6">{confidence * 100:.0f}%</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #f3f4f6;color:#6b7280">🚌 Confirmed By</td>
              <td style="padding:8px;border-bottom:1px solid #f3f4f6">{bus_count} bus(es): <strong>{bus_ids}</strong></td></tr>
          <tr><td style="padding:8px;color:#6b7280">✅ Action Required</td>
              <td style="padding:8px;font-weight:bold;color:#047857">{action_text}</td></tr>
        </table>
        <div style="margin-top:20px;text-align:center;">
          <a href="{maps_link}" style="background:#2563eb;color:white;padding:12px 24px;
             border-radius:6px;text-decoration:none;font-weight:bold;">
            📍 View Location on Google Maps
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin-top:20px;text-align:center;">
          Smart City Road-Defect Monitor · Chennai MTC Transit Fleet · Automated AI Alert
        </p>
      </div>
    </html></body>
    """
    return subject, html_body


def send_telegram_alert(defect: dict, alert_type: str = "new"):
    """Send alert to Telegram Bot (non-blocking, runs in background thread)."""
    if not ALERT_CONFIG["telegram_enabled"]:
        return
    token = ALERT_CONFIG["telegram_token"]
    chat_id = ALERT_CONFIG["telegram_chat_id"]
    if not token or not chat_id:
        return

    def _send():
        try:
            message = _format_telegram_message(defect, alert_type)
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            response = http_requests.post(url, json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "Markdown",
                "disable_web_page_preview": False
            }, timeout=5)
            if response.status_code == 200:
                print(f"[ALERT] Telegram alert sent for defect #{defect.get('id')} ({alert_type})")
            else:
                print(f"[ALERT] Telegram failed: {response.status_code} — {response.text[:100]}")
        except Exception as e:
            print(f"[ALERT] Telegram error: {e}")

    threading.Thread(target=_send, daemon=True).start()


def send_email_alert(defect: dict, alert_type: str = "new"):
    """Send alert email via Gmail SMTP (non-blocking, runs in background thread)."""
    if not ALERT_CONFIG["email_enabled"]:
        return
    gmail_user = ALERT_CONFIG["gmail_user"]
    gmail_password = ALERT_CONFIG["gmail_app_password"]
    recipients = [r.strip() for r in ALERT_CONFIG["alert_recipients"] if r.strip()]
    if not gmail_user or not gmail_password or not recipients:
        return

    def _send():
        try:
            subject, html_body = _format_email_body(defect, alert_type)
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Smart City Road Monitor <{gmail_user}>"
            msg["To"] = ", ".join(recipients)
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(gmail_user, gmail_password)
                server.sendmail(gmail_user, recipients, msg.as_string())
            print(f"[ALERT] Email sent to {recipients} for defect #{defect.get('id')}")
        except Exception as e:
            print(f"[ALERT] Email error: {e}")

    threading.Thread(target=_send, daemon=True).start()


def dispatch_alert(defect: dict, is_merged: bool, previous_bus_count: int = 1):
    """
    Main alert dispatcher — decides what kind of alert to send based on defect state.
    Called from main.py after every successful event ingestion.

    Alert triggers:
      1. New High-severity single-bus detection       → ⚠️  Warning alert
      2. bus_count goes 1 → 2 (first multi-bus match) → 🚨  Multi-Bus Verified alert
      3. bus_count reaches 4 (all buses confirmed)    → 🚨🚨 Critical all-bus alert
    """
    defect_id = defect.get("id")
    bus_count = defect.get("bus_count", 1)
    severity = defect.get("severity", "Low")

    # Trigger 1: First detection of a High-severity pothole (single bus, new)
    if (not is_merged and severity == "High"
            and ALERT_CONFIG["alert_on_new_high"]
            and defect_id not in _alerted_defect_ids):
        _alerted_defect_ids.add(defect_id)
        send_telegram_alert(defect, alert_type="new")
        send_email_alert(defect, alert_type="new")

    # Trigger 2: First time 2+ buses confirm the same defect (multi-bus verified)
    if (bus_count >= 2
            and ALERT_CONFIG["alert_on_multi_bus"]
            and defect_id not in _alerted_multiverified_ids
            and previous_bus_count < 2):
        _alerted_multiverified_ids.add(defect_id)
        send_telegram_alert(defect, alert_type="multi_bus")
        send_email_alert(defect, alert_type="multi_bus")

    # Trigger 3: All 4 buses confirmed (highest confidence event)
    if (bus_count >= 4
            and ALERT_CONFIG["alert_on_4bus_verified"]
            and defect_id not in {f"{d}_4x" for d in _alerted_multiverified_ids}):
        _alerted_multiverified_ids.add(f"{defect_id}_4x")
        send_telegram_alert(defect, alert_type="4bus_verified")
        send_email_alert(defect, alert_type="4bus_verified")


def clear_alert_cache():
    """Reset alert tracking (called on database reset)."""
    global _alerted_defect_ids, _alerted_multiverified_ids
    _alerted_defect_ids.clear()
    _alerted_multiverified_ids.clear()
