package com.hbjtu.canteen.dto;

public class SimulationParametersDto {
    private int simulationDurationMinutes;
    private double arrivalRate;
    private String dishRatio;
    private double averagePrepMinutes;
    private double averageEatMinutes;
    private int windowCount;
    private int chefCount;
    private int seatCount;
    private String dispatchRule;
    private boolean autoLeaveWhenFull;

    public SimulationParametersDto() {
        this.simulationDurationMinutes = 180;
        this.arrivalRate = 1.8;
        this.dishRatio = "A:40%, B:35%, C:25%";
        this.averagePrepMinutes = 5.5;
        this.averageEatMinutes = 24.0;
        this.windowCount = 4;
        this.chefCount = 4;
        this.seatCount = 24;
        this.dispatchRule = "最短队列";
        this.autoLeaveWhenFull = false;
    }

    public int getSimulationDurationMinutes() { return simulationDurationMinutes; }
    public void setSimulationDurationMinutes(int simulationDurationMinutes) { this.simulationDurationMinutes = simulationDurationMinutes; }
    public double getArrivalRate() { return arrivalRate; }
    public void setArrivalRate(double arrivalRate) { this.arrivalRate = arrivalRate; }
    public String getDishRatio() { return dishRatio; }
    public void setDishRatio(String dishRatio) { this.dishRatio = dishRatio; }
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
    public String getDispatchRule() { return dispatchRule; }
    public void setDispatchRule(String dispatchRule) { this.dispatchRule = dispatchRule; }
    public boolean isAutoLeaveWhenFull() { return autoLeaveWhenFull; }
    public void setAutoLeaveWhenFull(boolean autoLeaveWhenFull) { this.autoLeaveWhenFull = autoLeaveWhenFull; }
}
