package com.hirejob.dto.request;

import com.hirejob.model.enums.Role;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminUserUpdateRequest {

    @Size(min = 2, max = 100)
    private String fullName;

    @Pattern(regexp = "^$|^\\+?[0-9 ()-]{7,20}$", message = "Invalid phone number")
    private String phone;

    private Role role;

    private Boolean active;

    private Boolean emailVerified;
}
