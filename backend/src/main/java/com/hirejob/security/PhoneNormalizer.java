package com.hirejob.security;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Shared phone normalization helpers so Sri Lankan numbers work uniformly whether
 * typed as 771234567, 0771234567, 94771234567, or +94771234567.
 */
public final class PhoneNormalizer {

    private PhoneNormalizer() {}

    /** Returns every likely stored representation for database lookup. */
    public static List<String> candidates(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        String trimmed = raw.trim();
        String digits = trimmed.replaceAll("[^0-9]", "");

        Set<String> out = new LinkedHashSet<>();
        out.add(trimmed);
        if (!digits.isEmpty()) {
            out.add(digits);
            if (digits.startsWith("0") && digits.length() == 10) {
                String core = digits.substring(1);
                out.add(core);
                out.add("94" + core);
                out.add("+94" + core);
            } else if (digits.length() == 9 && !digits.startsWith("0")) {
                out.add("0" + digits);
                out.add("94" + digits);
                out.add("+94" + digits);
            } else if (digits.startsWith("94") && digits.length() == 11) {
                String core = digits.substring(2);
                out.add(core);
                out.add("0" + core);
                out.add("+" + digits);
            }
        }
        return List.copyOf(out);
    }

    /** Formats local/prefixed numbers consistently for storage (+94XXXXXXXXX for LK). */
    public static String normalizeForStorage(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String trimmed = raw.trim();
        String digits = trimmed.replaceAll("[^0-9]", "");
        if (digits.startsWith("0") && digits.length() == 10) {
            return "+94" + digits.substring(1);
        }
        if (digits.length() == 9 && !digits.startsWith("0")) {
            return "+94" + digits;
        }
        if (digits.startsWith("94") && digits.length() == 11) {
            return "+" + digits;
        }
        return trimmed;
    }
}
