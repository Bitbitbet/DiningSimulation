package com.sim.canteen.dto;

import com.sim.canteen.enums.DishType;

import java.util.Map;

public record SimulationParametersDto(
        int simulationTotalMinutes,

        double customerArrivalRate,
        Map<DishType, Integer> customerDishRatio,
        double customerEatTimeAvg,
        double customerEatTimeStdVar,

        double dishAveragePrepMinutes,

        int windowCount,
        int chefCount,
        int seatCount
) {
}
