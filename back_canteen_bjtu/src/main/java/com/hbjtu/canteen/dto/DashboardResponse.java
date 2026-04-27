package com.hbjtu.canteen.dto;

import com.hbjtu.canteen.enums.SimulationState;

import java.util.List;
import java.util.Map;

public class DashboardResponse {
    private SimulationState simulationState;
    private double simulationSpeed;
    private long currentTimeSecond;
    private double averageQueueLength;
    private double averageWaitMinutes;
    private double chefUtilization;
    private double seatTurnoverRate;
    private double seatIdleRate;
    private double congestionRate;
    private List<WindowDto> windows;
    private List<ChefDto> chefs;
    private List<SeatDto> seats;
    private List<CustomerDto> recentCustomers;
    private List<Map<String, Object>> history;
    private SimulationParametersDto parameters;

    public SimulationState getSimulationState() { return simulationState; }
    public void setSimulationState(SimulationState simulationState) { this.simulationState = simulationState; }
    public double getSimulationSpeed() { return simulationSpeed; }
    public void setSimulationSpeed(double simulationSpeed) { this.simulationSpeed = simulationSpeed; }
    public long getCurrentTimeSecond() { return currentTimeSecond; }
    public void setCurrentTimeSecond(long currentTimeSecond) { this.currentTimeSecond = currentTimeSecond; }
    public double getAverageQueueLength() { return averageQueueLength; }
    public void setAverageQueueLength(double averageQueueLength) { this.averageQueueLength = averageQueueLength; }
    public double getAverageWaitMinutes() { return averageWaitMinutes; }
    public void setAverageWaitMinutes(double averageWaitMinutes) { this.averageWaitMinutes = averageWaitMinutes; }
    public double getChefUtilization() { return chefUtilization; }
    public void setChefUtilization(double chefUtilization) { this.chefUtilization = chefUtilization; }
    public double getSeatTurnoverRate() { return seatTurnoverRate; }
    public void setSeatTurnoverRate(double seatTurnoverRate) { this.seatTurnoverRate = seatTurnoverRate; }
    public double getSeatIdleRate() { return seatIdleRate; }
    public void setSeatIdleRate(double seatIdleRate) { this.seatIdleRate = seatIdleRate; }
    public double getCongestionRate() { return congestionRate; }
    public void setCongestionRate(double congestionRate) { this.congestionRate = congestionRate; }
    public List<WindowDto> getWindows() { return windows; }
    public void setWindows(List<WindowDto> windows) { this.windows = windows; }
    public List<ChefDto> getChefs() { return chefs; }
    public void setChefs(List<ChefDto> chefs) { this.chefs = chefs; }
    public List<SeatDto> getSeats() { return seats; }
    public void setSeats(List<SeatDto> seats) { this.seats = seats; }
    public List<CustomerDto> getRecentCustomers() { return recentCustomers; }
    public void setRecentCustomers(List<CustomerDto> recentCustomers) { this.recentCustomers = recentCustomers; }
    public List<Map<String, Object>> getHistory() { return history; }
    public void setHistory(List<Map<String, Object>> history) { this.history = history; }
    public SimulationParametersDto getParameters() { return parameters; }
    public void setParameters(SimulationParametersDto parameters) { this.parameters = parameters; }
}
