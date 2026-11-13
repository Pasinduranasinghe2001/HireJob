package com.hirejob.security;

import java.util.regex.Pattern;

/**
 * Server-side input sanitiser (defence in depth against stored XSS / HTML injection).
 * React already escapes everything it renders; this additionally guarantees that no markup,
 * script, event handler or dangerous URL scheme is ever persisted.
 */
public final class InputSanitizer {

    private static final Pattern SCRIPT_STYLE = Pattern.compile("(?is)<(script|style|iframe|object|embed|svg|math)[^>]*>.*?</\\1\\s*>");
    private static final Pattern TAGS = Pattern.compile("(?s)<\\s*/?\\s*[a-zA-Z!][^>]*>");
    private static final Pattern DANGEROUS_SCHEMES = Pattern.compile("(?i)(javascript|vbscript|data)\\s*:");
    private static final Pattern EVENT_HANDLERS = Pattern.compile("(?i)\\bon[a-z]+\\s*=");
    // Control chars except tab, CR, LF
    private static final Pattern CONTROL = Pattern.compile("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]");

    private InputSanitizer() {}

    public static String clean(String input) {
        if (input == null) return null;
        String s = CONTROL.matcher(input).replaceAll("");
        s = SCRIPT_STYLE.matcher(s).replaceAll("");
        s = TAGS.matcher(s).replaceAll("");
        s = DANGEROUS_SCHEMES.matcher(s).replaceAll("");
        s = EVENT_HANDLERS.matcher(s).replaceAll("");
        s = s.replace("<", "").replace(">", "");
        return s.trim();
    }
}

