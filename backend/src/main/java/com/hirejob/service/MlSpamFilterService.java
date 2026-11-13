package com.hirejob.service;

import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class MlSpamFilterService {

    private static final List<String> SUSPICIOUS_KEYWORDS = Arrays.asList(
            "wire transfer", "western union", "crypto deposit", "send fee upfront",
            "easy money 1000$", "no work 50000", "whatsapp me only for bank transfer",
            "lottery winner", "free cash", "advance fee", "telegram @scam",
            "deposit required", "guaranteed 100% daily profit"
    );

    private static final Pattern PHONE_IN_TITLE_PATTERN = Pattern.compile("(\\+?[0-9]{9,13})");
    private static final Pattern SUSPICIOUS_LINKS_PATTERN = Pattern.compile("(bit\\.ly|t\\.me|tinyurl\\.com|wa\\.me)");

    public static class SpamCheckResult {
        private final double score;
        private final boolean flagged;
        private final String reason;

        public SpamCheckResult(double score, boolean flagged, String reason) {
            this.score = score;
            this.flagged = flagged;
            this.reason = reason;
        }

        public double getScore() {
            return score;
        }

        public boolean isFlagged() {
            return flagged;
        }

        public String getReason() {
            return reason;
        }
    }

    public SpamCheckResult analyze(String title, String description) {
        String fullText = (title + " " + (description != null ? description : "")).toLowerCase();
        double score = 0.0;
        StringBuilder reasons = new StringBuilder();

        for (String word : SUSPICIOUS_KEYWORDS) {
            if (fullText.contains(word)) {
                score += 0.35;
                reasons.append("Contains suspicious phrase: '").append(word).append("'. ");
            }
        }

        if (title != null && PHONE_IN_TITLE_PATTERN.matcher(title).find()) {
            score += 0.25;
            reasons.append("Phone number placed directly in title. ");
        }

        if (SUSPICIOUS_LINKS_PATTERN.matcher(fullText).find()) {
            score += 0.20;
            reasons.append("Shortened redirect link detected. ");
        }

        score = Math.min(score, 1.0);
        boolean flagged = score >= 0.5;

        return new SpamCheckResult(score, flagged, flagged ? reasons.toString().trim() : "Clean");
    }
}

