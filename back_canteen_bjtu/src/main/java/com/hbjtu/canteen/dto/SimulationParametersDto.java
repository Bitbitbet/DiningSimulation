package com.hbjtu.canteen.dto;

import com.hbjtu.canteen.enums.DishType;

import java.util.Map;

public record SimulationParametersDto(
        int simulationDurationMinutes,
        double arrivalRate,
        Map<DishType, Integer> dishRatio,
        double averagePrepMinutes,
        double averageEatMinutes,
        int windowCount,
        int chefCount,
        int seatCount,
        boolean autoLeaveWhenFull) {
}
