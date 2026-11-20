package com.hirejob.controller;

import com.hirejob.dto.response.ApiResponse;
import com.hirejob.model.entity.PlatformSetting;
import com.hirejob.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final AdminService adminService;

    /** Public runtime settings for the storefront (registration toggle, announcement banner). */
    @GetMapping("/public")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPublicSettings() {
        PlatformSetting s = adminService.getOrCreateSettings();
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "siteName", s.getSiteName(),
                "registrationEnabled", !Boolean.FALSE.equals(s.getRegistrationEnabled()),
                "siteAnnouncement", s.getSiteAnnouncement() == null ? "" : s.getSiteAnnouncement()
        )));
    }
}
