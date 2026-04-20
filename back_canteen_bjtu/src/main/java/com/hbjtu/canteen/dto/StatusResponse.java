package com.hbjtu.canteen.dto;

public class StatusResponse {
    private boolean online;
    private String serviceName;
    private String message;

    public StatusResponse() {
    }

    public StatusResponse(boolean online, String serviceName, String message) {
        this.online = online;
        this.serviceName = serviceName;
        this.message = message;
    }

    public boolean isOnline() {
        return online;
    }

    public void setOnline(boolean online) {
        this.online = online;
    }

    public String getServiceName() {
        return serviceName;
    }

    public void setServiceName(String serviceName) {
        this.serviceName = serviceName;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
