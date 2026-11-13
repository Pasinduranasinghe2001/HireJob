package com.hirejob.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.deser.std.StringDeserializer;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.hirejob.security.InputSanitizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;

/**
 * Every JSON string that reaches a controller is sanitised (HTML / script stripped) before it can
 * be stored. Secrets such as passwords, OTP codes and Google credentials are left untouched.
 */
@Configuration
public class JacksonSecurityConfig {

    private static final Set<String> RAW_FIELDS = Set.of("password", "currentpassword", "newpassword",
            "code", "credential", "challengeid");

    @Bean
    public Module sanitizingStringModule() {
        SimpleModule module = new SimpleModule("hirejob-xss-sanitizer");
        module.addDeserializer(String.class, new StringDeserializer() {
            @Override
            public String deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
                String value = super.deserialize(p, ctxt);
                String field = p.currentName();
                if (value == null || (field != null && RAW_FIELDS.contains(field.toLowerCase(Locale.ROOT)))) {
                    return value;
                }
                return InputSanitizer.clean(value);
            }
        });
        return module;
    }
}
