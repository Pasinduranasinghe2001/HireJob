package com.hirejob.security;

import com.hirejob.model.entity.User;
import com.hirejob.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        if (identifier == null || identifier.trim().isEmpty()) {
            throw new UsernameNotFoundException("Identifier cannot be empty");
        }
        String trimmed = identifier.trim();
        User user;
        if (trimmed.contains("@")) {
            user = userRepository.findByEmail(trimmed.toLowerCase(java.util.Locale.ROOT))
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + trimmed));
        } else {
            user = userRepository.findByPhone(trimmed)
                    .or(() -> userRepository.findByEmail(trimmed.toLowerCase(java.util.Locale.ROOT)))
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with phone or email: " + trimmed));
        }

        return CustomUserDetails.create(user);
    }

    @Transactional
    public UserDetails loadUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));

        return CustomUserDetails.create(user);
    }
}
