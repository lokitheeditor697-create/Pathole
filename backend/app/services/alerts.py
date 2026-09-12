import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Optional
import urllib.request
import urllib.parse
import json

class AlertService:
    def __init__(self):
        self.telegram_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.telegram_chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
        self.gmail_user = os.getenv("GMAIL_USER", "")
        self.gmail_password = os.getenv("GMAIL_APP_PASSWORD", "")
        self.recipients = [
            r.strip() for r in os.getenv("ALERT_RECIPIENTS", "").split(",") if r.strip()
        ]

    def send_telegram_alert(self, message: str) -> Dict[str, Any]:
        if not self.telegram_token or not self.telegram_chat_id:
            return {"status": "skipped", "reason": "TELEGRAM credentials not configured"}

        url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
        payload = {
            "chat_id": self.telegram_chat_id,
            "text": message,
            "parse_mode": "HTML"
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                return {"status": "success", "response": res_data}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def send_gmail_ticket(
        self, subject: str, body_html: str, recipients: Optional[list] = None
    ) -> Dict[str, Any]:
        targets = recipients or self.recipients
        if not self.gmail_user or not self.gmail_password or not targets:
            return {"status": "skipped", "reason": "GMAIL credentials or recipients not configured"}

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"AI Road Intelligence Dispatch <{self.gmail_user}>"
            msg["To"] = ", ".join(targets)

            msg.attach(MIMEText(body_html, "html"))

            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
                server.login(self.gmail_user, self.gmail_password)
                server.sendmail(self.gmail_user, targets, msg.as_string())

            return {"status": "success", "sent_to": targets}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def dispatch_critical_defect_ticket(self, defect: Dict[str, Any], segment: Dict[str, Any]):
        """Trigger instant notifications when a High/Critical defect is detected."""
        telegram_msg = (
            f"🚨 <b>ROAD DEFECT ALERT - {defect['severity'].upper()}</b>\n\n"
            f"<b>Class:</b> {defect['class_name']}\n"
            f"<b>Confidence:</b> {defect['confidence']:.2f}\n"
            f"<b>Road Segment:</b> {segment.get('segment_id', 'N/A')} ({segment.get('road_name', 'Arterial')})\n"
            f"<b>Chainage:</b> {segment.get('exact_chainage_m', 0):.1f}m\n"
            f"<b>Location:</b> {defect['latitude']:.5f}, {defect['longitude']:.5f}\n"
            f"<b>Patrol Vehicle:</b> {defect['vehicle_id']}\n"
            f"<b>Multi-Bus Verified:</b> {'YES' if defect.get('is_multi_bus_verified') else 'NO'}\n"
            f"<i>Action: Municipal inspection required within 24h.</i>"
        )
        self.send_telegram_alert(telegram_msg)

        subject = f"[CRITICAL DISPATCH] Road Defect Verified: {defect['class_name']} at {segment.get('segment_id', 'Segment')}"
        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
          <div style="background-color: #0f172a; color: white; padding: 16px; border-radius: 6px;">
            <h2 style="margin: 0; color: #38bdf8;">AI Road Intelligence & Predictive Maintenance Platform</h2>
            <p style="margin: 4px 0 0 0; color: #94a3b8;">Automated Municipal Inspection Ticket</p>
          </div>
          <div style="padding: 20px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 15px;">
            <h3 style="color: #ef4444; margin-top: 0;">Severity: {defect['severity']} Defect Detected</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;"><strong>Defect Class:</strong></td><td>{defect['class_name']}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Confidence Score:</strong></td><td>{defect['confidence']:.2f}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Road / Segment:</strong></td><td>{segment.get('road_name', 'Arterial')} / {segment.get('segment_id', 'N/A')}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Chainage:</strong></td><td>{segment.get('exact_chainage_m', 0):.1f} meters</td></tr>
              <tr><td style="padding: 8px 0;"><strong>GPS Coordinates:</strong></td><td>{defect['latitude']:.6f}, {defect['longitude']:.6f}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Patrol Bus ID:</strong></td><td>{defect['vehicle_id']}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Reporting Vehicles:</strong></td><td>{defect.get('reporting_vehicles', defect['vehicle_id'])}</td></tr>
            </table>
            <div style="margin-top: 20px; padding: 12px; background-color: #fef2f2; border-left: 4px solid #ef4444;">
              <strong>Recommended Action:</strong> Priority road repair crew dispatch within 24 hours.
            </div>
          </div>
        </body>
        </html>
        """
        self.send_gmail_ticket(subject, body_html)

alert_service = AlertService()
