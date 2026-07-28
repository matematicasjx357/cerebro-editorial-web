"""
=============================================================================
NOTIFICADOR DE TELEGRAM / DISCORD - Sistema ZENIT
telegram_notifier.py
=============================================================================

Script auxiliar para enviar notificaciones desde el bot local.
"""

import os
import requests
import json
import argparse
from datetime import datetime

class ZenitNotifier:
    def __init__(self, token=None, chat_id=None, discord_url=None):
        self.token = token or os.environ.get("TELEGRAM_BOT_TOKEN")
        self.chat_id = chat_id or os.environ.get("TELEGRAM_CHAT_ID")
        self.discord_url = discord_url or os.environ.get("DISCORD_WEBHOOK_URL")

    def send_telegram(self, message, parse_mode="Markdown"):
        if not self.token or not self.chat_id:
            return False
        
        url = f"https://api.telegram.org/bot{self.token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": message,
            "parse_mode": parse_mode
        }
        
        try:
            resp = requests.post(url, json=payload, timeout=10)
            return resp.status_code == 200
        except Exception as e:
            print(f"Error sending Telegram: {e}")
            return False

    def send_discord(self, title, description, status="info", fields=None):
        if not self.discord_url:
            return False
            
        color = 0x00ff00 if status == "success" else 0xff0000 if status == "error" else 0x0000ff
        
        payload = {
            "embeds": [{
                "title": f"ZENIT: {title}",
                "description": description,
                "color": color,
                "fields": fields or [],
                "timestamp": datetime.now().isoformat()
            }]
        }
        
        try:
            resp = requests.post(self.discord_url, json=payload, timeout=10)
            return resp.status_code == 204
        except Exception as e:
            print(f"Error sending Discord: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description="Zenit Notifier CLI")
    parser.add_argument("--status", choices=["success", "error", "info"], default="info")
    parser.add_argument("--message", required=True)
    parser.add_argument("--platform", default="Local Bot")
    args = parser.parse_args()

    notifier = ZenitNotifier()
    
    # Enviar a Telegram
    icon = "✅" if args.status == "success" else "❌" if args.status == "error" else "ℹ️"
    msg = f"{icon} *ZENIT: {args.status.upper()}*\n\n{args.message}\n\n*Plataforma:* {args.platform}"
    notifier.send_telegram(msg)
    
    # Enviar a Discord
    notifier.send_discord(
        title=args.status.upper(),
        description=args.message,
        status=args.status,
        fields=[{"name": "Plataforma", "value": args.platform, "inline": True}]
    )

if __name__ == "__main__":
    main()
