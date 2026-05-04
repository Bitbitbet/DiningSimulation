package com.sim.canteen.dto.response;

import com.sim.canteen.enums.SimulationState;

import java.util.List;

public record DashboardResponse(
        SimulationState simulationState,
        List<HistoryPointDto> history,
        List<Integer> windowsQueueSizes,
        List<Integer> seatOccupation
) {
}