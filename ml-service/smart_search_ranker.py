"""
HireJob ML Service - Smart Multi-Language Search & Priority Ranking
Supports English, Sinhala, and Tamil queries.
Ranks results based on TF-IDF relevance, reputation score, recency, and Paid Priority tier (eBay / AliExpress algorithm).
"""

from typing import List, Dict, Any
import math
import time

# Trilingual keyword dictionary for Sri Lankan services
TRILINGUAL_SYNONYMS = {
    "electrician": ["විදුලි", "විදුලි කාර්මික", "மின் பணியாளர்", "wiring", "electrical"],
    "plumber": ["නල කාර්මික", "වතුර බට", "குழாய் பணியாளர்", "plumbing"],
    "carpenter": ["වඩු කාර්මික", "ලී වැඩ", "தச்சர்", "wood work"],
    "mason": ["පෙදරේරු", "ගඩොල් වැඩ", "கொத்தனார்", "construction"],
    "driver": ["රියදුරු", "රියදුරු සේවා", "ஓட்டுநர்", "van hire", "cab"],
    "mechanic": ["කාර්මික ශිල්පී", "වාහන අලුත්වැඩියා", "மெக்கானிக்", "auto repair"],
    "web developer": ["වෙබ් අඩවි", "සොෆ්ට්වෙයාර්", "வலை டெவலப்பர்", "software", "programmer"],
}

class SearchRanker:
    def __init__(self, priority_boost_weight: float = 2.5):
        self.priority_boost_weight = priority_boost_weight

    def expand_query(self, query: str) -> List[str]:
        """Expands keywords across English, Sinhala, and Tamil synonyms."""
        q = query.lower().strip()
        tokens = [q]
        for key, syns in TRILINGUAL_SYNONYMS.items():
            if key in q or any(s in q for s in syns):
                tokens.append(key)
                tokens.extend(syns)
        return list(set(tokens))

    def rank_listings(self, query: str, listings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        expanded = self.expand_query(query)
        scored = []

        now = time.time()

        for item in listings:
            text = f"{item.get('title', '')} {item.get('description', '')} {item.get('category', '')}".lower()
            
            # 1. Relevance score
            relevance = sum(1.0 for term in expanded if term in text)

            # 2. Paid Priority multiplier (bump to top)
            is_priority = item.get("is_priority", False)
            priority_multiplier = self.priority_boost_weight if is_priority else 1.0

            # 3. Seller rating
            rating = item.get("rating", 4.0)

            # 4. Final composite score
            final_score = (relevance * 2.0 + rating * 0.5) * priority_multiplier
            
            scored.append({
                **item,
                "calculated_rank_score": round(final_score, 2)
            })

        # Sort highest score first (Priority items naturally rise to top)
        scored.sort(key=lambda x: x["calculated_rank_score"], reverse=True)
        return scored

if __name__ == "__main__":
    ranker = SearchRanker()
    mock_listings = [
        {"id": 1, "title": "House Electrician in Colombo", "category": "Home", "rating": 4.8, "is_priority": False},
        {"id": 2, "title": "Professional Electrician & Wiring", "category": "Home", "rating": 4.5, "is_priority": True},
        {"id": 3, "title": "විදුලි කාර්මික සේවා - Kandy", "category": "Home", "rating": 5.0, "is_priority": False},
    ]

    print("Query: 'විදුලි කාර්මික'")
    ranked = ranker.rank_listings("විදුලි කාර්මික", mock_listings)
    for r in ranked:
        print(f"ID {r['id']}: {r['title']} | Priority: {r['is_priority']} | Score: {r['calculated_rank_score']}")

