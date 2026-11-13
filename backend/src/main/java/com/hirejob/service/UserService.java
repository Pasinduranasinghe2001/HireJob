package com.hirejob.service;

import com.hirejob.dto.response.UserResponse;
import com.hirejob.exception.BadRequestException;
import com.hirejob.exception.ResourceNotFoundException;
import com.hirejob.model.entity.User;
import com.hirejob.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return mapToUserResponse(user);
    }

    public UserResponse updateUser(Long id, String fullName, String phone) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        if (fullName != null && !fullName.isBlank()) {
            String name = fullName.trim();
            if (name.length() < 2 || name.length() > 100) {
                throw new BadRequestException("Full name must be between 2 and 100 characters");
            }
            user.setFullName(name);
        }
        if (phone != null) {
            String p = phone.trim();
            if (!p.isEmpty() && !p.matches("^\\+?[0-9 ()-]{7,20}$")) {
                throw new BadRequestException("Invalid phone number");
            }
            user.setPhone(p);
        }

        user = userRepository.save(user);
        return mapToUserResponse(user);
    }

    public UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .emailVerified(user.getEmailVerified())
                .twoFactorEnabled(user.getTwoFactorEnabled())
                .twoFactorType(user.getTwoFactorType())
                .createdAt(user.getCreatedAt())
                .build();
    }
}

