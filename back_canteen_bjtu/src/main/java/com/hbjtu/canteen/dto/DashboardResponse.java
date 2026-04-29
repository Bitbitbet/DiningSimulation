package com.hbjtu.canteen.dto;

import com.hbjtu.canteen.enums.SimulationState;

import java.util.List;
import java.util.Map;

public record DashboardResponse(
        SimulationState simulationState,
        double simulationSpeed,
        long currentTimeSecond,
        double averageQueueLength,
        double averageWaitMinutes,
        double chefUtilization,
        double seatTurnoverRate,
        double seatIdleRate,
        double congestionRate,
        List<WindowDto> windows,
        List<ChefDto> chefs,
        List<SeatDto> seats,
        List<CustomerDto> recentCustomers,
        List<Map<String, Object>> history,
        SimulationParametersDto parameters
) {
}