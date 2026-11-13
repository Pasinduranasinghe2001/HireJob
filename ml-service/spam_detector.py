"""
HireJob ML Service - Spam & Fraud Detection Model
Detects suspicious listings, advance fee frauds, pyramid schemes, contact obfuscation, and suspicious keywords.
"""

import re
from typing import Dict, Any

SUSPICIOUS_KEYWORDS = [
    "wire transfer", "western union", "crypto deposit", "send fee upfront",
    "easy money 1000$", "no work 50000", "whatsapp me only for bank transfer",
    "lottery winner", "free cash", "advance fee", "telegram @scam",
    "deposit required", "guaranteed 100% daily profit", "pyramid", "investment double"
]

PHONE_PATTERN = re.compile(r'(\+?[0-9]{9,13})')
URL_SHORTENER_PATTERN = re.compile(r'(bit\.ly|tinyurl\.com|t\.me|wa\.link|goo\.gl)')

class JobSpamDetector:
    def __init__(self, threshold: float = 0.5):
        self.threshold = threshold

    def predict(self, title: str, description: str) -> Dict[str, Any]:
        """
        Analyzes title and description to compute spam risk score (0.0 to 1.0)
        and determine whether to flag the post for manual admin moderation.
        """
        text = f"{title or ''} {description or ''}".lower()
        score = 0.0
        reasons = []

        # Check for banned/suspicious financial fraud triggers
        for kw in SUSPICIOUS_KEYWORDS:
            if kw in text:
                score += 0.35
                reasons.append(f"Trigger keyword detected: '{kw}'")

        # Check if telephone number is shoved into title
        if title and PHONE_PATTERN.search(title):
            score += 0.25
            reasons.append("Phone number placed directly in title to bypass filters")

        # Check for URL shorteners
        if URL_SHORTENER_PATTERN.search(text):
            score += 0.20
            reasons.append("Suspicious redirect link or URL shortener detected")

        # Cap score between 0.0 and 1.0
        score = min(round(score, 2), 1.0)
        is_spam = score >= self.threshold

        return {
            "spam_score": score,
            "is_flagged": is_spam,
            "status": "FLAGGED_FOR_REVIEW" if is_spam else "CLEAN",
            "reasons": reasons if reasons else ["Content passed NLP safety filters"]
        }

if __name__ == "__main__":
    detector = JobSpamDetector()
    test_cases = [
        ("Clean Electrician Job", "Looking for certified electrician for house wiring in Colombo. Budget LKR 15,000."),
        ("EARN 50000$ DAILY NO WORK", "Just send crypto deposit and wire transfer advance fee to start today!")
    ]

    for title, desc in test_cases:
        res = detector.predict(title, desc)
        print(f"Title: {title}\nResult: {res}\n")

