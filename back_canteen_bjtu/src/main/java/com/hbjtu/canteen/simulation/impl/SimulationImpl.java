package com.hbjtu.canteen.simulation.impl;

import com.hbjtu.canteen.simulation.Simulation;

public class SimulationImpl implements Simulation {
    private final Thread workerThread;
    private volatile boolean running;
    private final Object pauseLock = new Object();
    private volatile long intervalMillis;

    public SimulationImpl() {
        running = false;
        this.workerThread = new Thread(this::workerRun);
    }

    public void setUpdatePerSecond(int updatePerSecond) {}

    public void pauseSimulation() {}

    public void resumeSimulation() {}

    public void getDashboardResponse() {}

    private void workerRun() {}
}
