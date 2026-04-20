package com.hbjtu.canteen.service;

import com.hbjtu.canteen.dto.DashboardResponse;
import com.hbjtu.canteen.dto.ReservationRequest;
import com.hbjtu.canteen.dto.ReservationResponse;
import com.hbjtu.canteen.dto.SimulationParametersDto;
import com.hbjtu.canteen.dto.StatusResponse;

public interface CanteenService {
    StatusResponse getStatus();
    DashboardResponse getDashboard();
    ReservationResponse estimateReservation(ReservationRequest request);
    ReservationResponse confirmReservation(ReservationRequest request);
    DashboardResponse updateParameters(SimulationParametersDto parameters);
    DashboardResponse startSimulation();
    DashboardResponse pauseSimulation();
    DashboardResponse resetSimulation();
}
