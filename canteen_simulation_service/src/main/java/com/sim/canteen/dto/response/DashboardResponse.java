package com.sim.canteen.dto.response;

import com.sim.canteen.enums.SimulationState;

import java.util.List;

public record DashboardResponse(
        SimulationState simulationState,
        HistoryPointDto currentHistory,
        List<Integer> windowsQueueSizes,
        List<Integer> seatOccupation
) {
}