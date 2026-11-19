package com.hirejob.repository;

import com.hirejob.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    Optional<User> findFirstByPhoneIn(Collection<String> phones);

    Optional<User> findByGoogleId(String googleId);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByPhoneIn(Collection<String> phones);

    long countByRole(com.hirejob.model.enums.Role role);
}
