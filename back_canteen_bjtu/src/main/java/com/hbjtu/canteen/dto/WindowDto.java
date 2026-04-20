package com.hbjtu.canteen.dto;

import java.util.List;

public class WindowDto {
    private int id;
    private int chefId;
    private List<Integer> queue;
    private String status;
    private double serveRate;
    private String dishType;
    private int estimatedWaitMinutes;

    public WindowDto() {
    }

    public WindowDto(int id, int chefId, List<Integer> queue, String status, double serveRate, String dishType, int estimatedWaitMinutes) {
        this.id = id;
        this.chefId = chefId;
        this.queue = queue;
        this.status = status;
        this.serveRate = serveRate;
        this.dishType = dishType;
        this.estimatedWaitMinutes = estimatedWaitMinutes;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public int getChefId() { return chefId; }
    public void setChefId(int chefId) { this.chefId = chefId; }
    public List<Integer> getQueue() { return queue; }
    public void setQueue(List<Integer> queue) { this.queue = queue; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public double getServeRate() { return serveRate; }
    public void setServeRate(double serveRate) { this.serveRate = serveRate; }
    public String getDishType() { return dishType; }
    public void setDishType(String dishType) { this.dishType = dishType; }
    public int getEstimatedWaitMinutes() { return estimatedWaitMinutes; }
    public void setEstimatedWaitMinutes(int estimatedWaitMinutes) { this.estimatedWaitMinutes = estimatedWaitMinutes; }
}
