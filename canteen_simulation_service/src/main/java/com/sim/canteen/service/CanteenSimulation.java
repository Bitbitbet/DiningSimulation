package com.sim.canteen.service;

import com.sim.canteen.dto.DashboardResponse;
import com.sim.canteen.dto.SimulationParametersDto;
import com.sim.canteen.dto.StatusResponse;
import org.springframework.stereotype.Service;

@Service
public interface CanteenSimulation {
    public void pauseSimulation();

    public boolean resumeSimulation();

    StatusResponse getStatus();

    public void getDashboardResponse();

    public void selectSimulationData(SimulationParametersDto parameters);

    public void shutdown();
}
