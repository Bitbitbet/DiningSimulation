package com.hbjtu.canteen;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication  // 这个注解必须加
public class CanteenApplication {

    public static void main(String[] args) {
        SpringApplication.run(CanteenApplication.class, args);
    }
}