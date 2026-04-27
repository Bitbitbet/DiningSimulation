package com.hbjtu.canteen.simulation;

public interface Simulation {
    public void setUpdatePerSecond(int updatePerSecond);

    public void pauseSimulation();

    public void resumeSimulation();

    public void getDashboardResponse();
}
