package com.hbjtu.canteen.dto;

public class ChefDto {
    private int id;
    private String skill;
    private Integer currentOrder;
    private String status;
    private double utilization;

    public ChefDto() {
    }

    public ChefDto(int id, String skill, Integer currentOrder, String status, double utilization) {
        this.id = id;
        this.skill = skill;
        this.currentOrder = currentOrder;
        this.status = status;
        this.utilization = utilization;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getSkill() { return skill; }
    public void setSkill(String skill) { this.skill = skill; }
    public Integer getCurrentOrder() { return currentOrder; }
    public void setCurrentOrder(Integer currentOrder) { this.currentOrder = currentOrder; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public double getUtilization() { return utilization; }
    public void setUtilization(double utilization) { this.utilization = utilization; }
}
