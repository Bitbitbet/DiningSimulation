package com.hbjtu.canteen.dto;

import com.hbjtu.canteen.enums.CustomerStatus;
import com.hbjtu.canteen.enums.DishType;

public class CustomerDto {
    private int id;
    private double arriveTime;
    private DishType orderType;
    private double prepTime;
    private double eatTime;
    private int windowId;
    private double queueStart;
    private double queueEnd;
    private double eatStart;
    private double leaveTime;
    private CustomerStatus status;

    public CustomerDto() {
    }

    public CustomerDto(int id, double arriveTime, DishType orderType, double prepTime,
                       double eatTime, int windowId, double queueStart, double queueEnd,
                       double eatStart, double leaveTime, CustomerStatus status) {
        this.id = id;
        this.arriveTime = arriveTime;
        this.orderType = orderType;
        this.prepTime = prepTime;
        this.eatTime = eatTime;
        this.windowId = windowId;
        this.queueStart = queueStart;
        this.queueEnd = queueEnd;
        this.eatStart = eatStart;
        this.leaveTime = leaveTime;
        this.status = status;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public double getArriveTime() { return arriveTime; }
    public void setArriveTime(double arriveTime) { this.arriveTime = arriveTime; }
    public DishType getOrderType() { return orderType; }
    public void setOrderType(DishType orderType) { this.orderType = orderType; }
    public double getPrepTime() { return prepTime; }
    public void setPrepTime(double prepTime) { this.prepTime = prepTime; }
    public double getEatTime() { return eatTime; }
    public void setEatTime(double eatTime) { this.eatTime = eatTime; }
    public int getWindowId() { return windowId; }
    public void setWindowId(int windowId) { this.windowId = windowId; }
    public double getQueueStart() { return queueStart; }
    public void setQueueStart(double queueStart) { this.queueStart = queueStart; }
    public double getQueueEnd() { return queueEnd; }
    public void setQueueEnd(double queueEnd) { this.queueEnd = queueEnd; }
    public double getEatStart() { return eatStart; }
    public void setEatStart(double eatStart) { this.eatStart = eatStart; }
    public double getLeaveTime() { return leaveTime; }
    public void setLeaveTime(double leaveTime) { this.leaveTime = leaveTime; }
    public CustomerStatus getStatus() { return status; }
    public void setStatus(CustomerStatus status) { this.status = status; }
}
