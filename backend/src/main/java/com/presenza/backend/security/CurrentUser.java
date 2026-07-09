package com.presenza.backend.security;

import com.presenza.backend.entity.MemberStatus;
import com.presenza.backend.entity.User;
import com.presenza.backend.exception.ApiException;
import com.presenza.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Small helper for pulling the authenticated User entity out of the security context. */
@Component
@RequiredArgsConstructor
public class CurrentUser {

    private final UserRepository userRepository;

    public User get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            throw ApiException.forbidden("Not authenticated.");
        }
        User user = userRepository.findById(principal.getUser().getId())
                .orElseThrow(() -> ApiException.notFound("User no longer exists."));
        // Re-checked on every request (not just at login) so a token issued before an admin
        // deactivates the account stops working immediately rather than staying valid until expiry.
        if (user.getStatus() == MemberStatus.INACTIVE) {
            throw ApiException.forbidden("This account has been deactivated.");
        }
        return user;
    }
}
