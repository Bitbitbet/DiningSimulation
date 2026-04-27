package com.hbjtu.canteen.dto;

import com.hbjtu.canteen.enums.ChefSkillType;

public class ChefDto {
    private int id;
    private ChefSkillType skill;
    private Integer currentOrder;
    private boolean busy;
    private double utilization;

    public ChefDto() {
    }

    public ChefDto(int id, ChefSkillType skill, Integer currentOrder, boolean busy, double utilization) {
        this.id = id;
        this.skill = skill;
        this.currentOrder = currentOrder;
        this.busy = busy;
        this.utilization = utilization;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public ChefSkillType getSkill() { return skill; }
    public void setSkill(ChefSkillType skill) { this.skill = skill; }
    public Integer getCurrentOrder() { return currentOrder; }
    public void setCurrentOrder(Integer currentOrder) { this.currentOrder = currentOrder; }
    public boolean isBusy() { return busy; }
    public void setIsBusy(boolean busy) { this.busy = busy; }
    public double getUtilization() { return utilization; }
    public void setUtilization(double utilization) { this.utilization = utilization; }
}
