package com.hirejob.dto.response;

import com.hirejob.model.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private String avatarUrl;
    private Role role;
    private Boolean emailVerified;
    private Boolean twoFactorEnabled;
    private String twoFactorType;
    private LocalDateTime createdAt;
}
