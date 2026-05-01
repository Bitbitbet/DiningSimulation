package com.sim.canteen.dto;

import com.sim.canteen.enums.DishType;

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
