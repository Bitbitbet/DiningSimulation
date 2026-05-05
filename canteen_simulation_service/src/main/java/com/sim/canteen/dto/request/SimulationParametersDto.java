package com.sim.canteen.dto.request;

import com.sim.canteen.enums.DishType;

import java.util.List;
import java.util.Map;

public record SimulationParametersDto(
        int simulationTotalMinutes,

        double customerArriveRate,
        Map<Integer, Integer> customerGroupSizeRatio,
        Map<DishType, Integer> customerDishRatio,

        double customerEatSecondsAvg,
        double customerEatSecondsStdVar,

        double dishPrepSecondsAvg,
        double dishPrepTimeSecondsVar,

        List<WindowParametersDto> windows,
        int seatCount
) {
}