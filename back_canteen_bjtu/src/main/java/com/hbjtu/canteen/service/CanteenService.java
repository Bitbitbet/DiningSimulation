package com.hbjtu.canteen.service;

import com.hbjtu.canteen.dto.DashboardResponse;
import com.hbjtu.canteen.dto.SimulationParametersDto;
import com.hbjtu.canteen.dto.StatusResponse;

public interface CanteenService {
    StatusResponse getStatus();
    DashboardResponse getDashboard();
    DashboardResponse updateParameters(SimulationParametersDto parameters);
    DashboardResponse startSimulation();
    DashboardResponse pauseSimulation();
    DashboardResponse resetSimulation();
}
