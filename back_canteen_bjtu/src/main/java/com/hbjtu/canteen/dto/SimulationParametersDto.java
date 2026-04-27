package com.hbjtu.canteen.dto;

import com.hbjtu.canteen.enums.DishType;

import java.util.Map;

public class SimulationParametersDto {
    private int simulationDurationMinutes;
    private double arrivalRate;
    private Map<DishType, Integer> dishRatio;
    private double averagePrepMinutes;
    private double averageEatMinutes;
    private int windowCount;
    private int chefCount;
    private int seatCount;
    private boolean autoLeaveWhenFull;

    public SimulationParametersDto() {
        this.simulationDurationMinutes = 180;
        this.arrivalRate = 1.8;
        this.dishRatio = null;
        this.averagePrepMinutes = 5.5;
        this.averageEatMinutes = 24.0;
        this.windowCount = 4;
        this.chefCount = 4;
        this.seatCount = 24;
        this.autoLeaveWhenFull = false;
    }

    public int getSimulationDurationMinutes() { return simulationDurationMinutes; }
    public void setSimulationDurationMinutes(int simulationDurationMinutes) { this.simulationDurationMinutes = simulationDurationMinutes; }
    public double getArrivalRate() { return arrivalRate; }
    public void setArrivalRate(double arrivalRate) { this.arrivalRate = arrivalRate; }
    public Map<DishType, Integer> getDishRatio() { return dishRatio; }
    public void setDishRatio(Map<DishType, Integer> dishRatio) { this.dishRatio = dishRatio; }
    public double getAveragePrepMinutes() { return averagePrepMinutes; }
    public void setAveragePrepMinutes(double averagePrepMinutes) { this.averagePrepMinutes = averagePrepMinutes; }
    public double getAverageEatMinutes() { return averageEatMinutes; }
    public void setAverageEatMinutes(double averageEatMinutes) { this.averageEatMinutes = averageEatMinutes; }
    public int getWindowCount() { return windowCount; }
    public void setWindowCount(int windowCount) { this.windowCount = windowCount; }
    public int getChefCount() { return chefCount; }
    public void setChefCount(int chefCount) { this.chefCount = chefCount; }
    public int getSeatCount() { return seatCount; }
    public void setSeatCount(int seatCount) { this.seatCount = seatCount; }
    public boolean isAutoLeaveWhenFull() { return autoLeaveWhenFull; }
    public void setAutoLeaveWhenFull(boolean autoLeaveWhenFull) { this.autoLeaveWhenFull = autoLeaveWhenFull; }
}
