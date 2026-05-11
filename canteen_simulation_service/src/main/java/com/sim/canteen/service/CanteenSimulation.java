package com.sim.canteen.service;

import com.sim.canteen.dto.response.DashboardResponse;
import com.sim.canteen.dto.response.HistoryResponse;
import com.sim.canteen.dto.response.StatusResponse;
import com.sim.canteen.simulation.SimulationData;
import org.springframework.stereotype.Service;

@Service
public interface CanteenSimulation {
    public void pauseSimulation();

    public boolean resumeSimulation();

    public void shutdown();

    /**
     * 设置仿真运行倍速
     * @param speed 实际时间的多少倍速，必须大于零
     */
    public void setSimulationSpeed(double speed);

    public void setSimulationData(SimulationData simulationData);

    StatusResponse getStatus();

    public DashboardResponse getDashboardResponse();
}
