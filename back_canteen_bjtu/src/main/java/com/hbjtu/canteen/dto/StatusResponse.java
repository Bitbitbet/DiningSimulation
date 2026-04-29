package com.hbjtu.canteen.dto;

public record StatusResponse(
        boolean online,
        String serviceName,
        String message
) {
}
