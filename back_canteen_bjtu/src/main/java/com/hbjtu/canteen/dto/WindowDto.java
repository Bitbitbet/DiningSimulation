package com.hbjtu.canteen.dto;

import com.hbjtu.canteen.enums.DishType;

import java.util.List;

public class WindowDto {
    private int id;
    private int chefId;
    private List<Integer> queue;
    private boolean busy;
    private double serveRate;
    private DishType dishType;
    private int estimatedWaitMinutes;

    public WindowDto() {
    }

    public WindowDto(int id, int chefId, List<Integer> queue, boolean busy,
                     double serveRate, DishType dishType, int estimatedWaitMinutes) {
        this.id = id;
        this.chefId = chefId;
        this.queue = queue;
        this.busy = busy;
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
    public boolean isBusy() { return busy; }
    public void setIsBusy(boolean busy) { this.busy = busy; }
    public double getServeRate() { return serveRate; }
    public void setServeRate(double serveRate) { this.serveRate = serveRate; }
    public DishType getDishType() { return dishType; }
    public void setDishType(DishType dishType) { this.dishType = dishType; }
    public int getEstimatedWaitMinutes() { return estimatedWaitMinutes; }
    public void setEstimatedWaitMinutes(int estimatedWaitMinutes) { this.estimatedWaitMinutes = estimatedWaitMinutes; }
}
