package com.hbjtu.canteen.service;

import org.springframework.stereotype.Service;

@Service
public interface CanteenSimulation {
    public void setUpdatePerSecond(int updatePerSecond);

    public void pauseSimulation();

    public void resumeSimulation();

    public void getDashboardResponse();

    public void shutdown();
}
