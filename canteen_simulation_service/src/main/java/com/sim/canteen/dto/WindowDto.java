package com.sim.canteen.dto;

import com.sim.canteen.enums.DishType;

import java.util.List;

public record WindowDto(
        DishType dishType,
        double windowPrepTimeModifier,
        List<Integer> queue
) {
}
