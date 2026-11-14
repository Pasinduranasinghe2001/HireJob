package com.hirejob.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Email or phone number is required")
    @Size(max = 150)
    private String email; // Accepts user email or registered mobile phone number

    @NotBlank(message = "Password is required")
    @Size(max = 100)
    private String password;
}
