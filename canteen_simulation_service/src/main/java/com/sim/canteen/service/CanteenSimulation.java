package com.sim.canteen.service;

import com.sim.canteen.dto.request.SimulationParametersDto;
import com.sim.canteen.dto.response.DashboardResponse;
import com.sim.canteen.dto.response.StatusResponse;
import com.sim.canteen.enums.ResumeSimulationRst;
import com.sim.canteen.simulation.SimulationData;
import org.springframework.stereotype.Service;

@Service
public interface CanteenSimulation {
    public void pauseSimulation();
    public ResumeSimulationRst resumeSimulation();
    public void shutdown();
    public void setSimulationData(SimulationData simulationData);

    StatusResponse getStatus();

    public DashboardResponse getDashboardResponse();
}
