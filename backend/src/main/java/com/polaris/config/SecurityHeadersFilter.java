package com.polaris.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Security Headers Filter
 * Adds security-related HTTP headers to all responses to protect against common web vulnerabilities
 */
@Component
public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        // Prevent MIME type sniffing
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        
        // Prevent clickjacking attacks
        httpResponse.setHeader("X-Frame-Options", "DENY");
        
        // Enable XSS protection in older browsers
        httpResponse.setHeader("X-XSS-Protection", "1; mode=block");
        
        // Enforce HTTPS (only in production)
        // Uncomment when deploying to production with HTTPS
        // httpResponse.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        
        // Referrer Policy - control referrer information
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        
        // Permissions Policy - control browser features
        httpResponse.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
        
        chain.doFilter(request, response);
    }
}
