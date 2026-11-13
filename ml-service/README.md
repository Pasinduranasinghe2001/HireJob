# HireJob ML Service 🤖

This module provides AI and Machine Learning capabilities for the **HireJob Sri Lanka Marketplace**:

1. **Spam & Fraud Detection (`spam_detector.py`)**:
   - Scans service posts in real-time for advance fee scams, pyramid schemes, unauthorized wire transfer requests, URL obfuscation, and phone number cloaking.
   - Calculates a `spam_score` from `0.0` to `1.0`. Any post with `score >= 0.5` is automatically flagged (`is_flagged = true`) for manual admin inspection without exposing user sensitive data.

2. **Smart Trilingual Search & Priority Ranker (`smart_search_ranker.py`)**:
   - Trilingual synonym dictionary covering **English**, **Sinhala (සිංහල)**, and **Tamil (தமிழ்)** for common Sri Lankan professions (Electricians, Plumbers, Carpenters, Masons, Drivers, Mechanics, Software Developers).
   - Ranks results using composite weights: relevance score + seller reputation rating + paid priority multiplier (bumps featured posts to the top like eBay / AliExpress).

3. **In-Process Java Bridge**:
   - Spring Boot features a built-in fast fallback evaluator (`MlSpamFilterService.java`), ensuring high throughput and zero external process latency.

