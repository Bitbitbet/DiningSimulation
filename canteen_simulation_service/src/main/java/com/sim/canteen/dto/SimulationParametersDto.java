package com.sim.canteen.dto;

import com.sim.canteen.enums.DishType;

import java.util.List;
import java.util.Map;

public record SimulationParametersDto(
        int simulationTotalMinutes,

        double customerArriveRate,
        Map<Integer, Integer> customerGroupSizeRatio,
        Map<DishType, Integer> customerDishRatio,

        double customerEatTimeAvg,
        double customerEatTimeStdVar,

        double dishPrepTimeAvg,
        double dishPrepTimeStdVar,

        List<WindowParameterDto> windows,
        int seatCount
) {
}