package com.polaris;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "com.polaris")
@EnableAsync
@EnableScheduling
public class PolarisApplication {
    public static void main(String[] args) {
        SpringApplication.run(PolarisApplication.class, args);
    }
}
