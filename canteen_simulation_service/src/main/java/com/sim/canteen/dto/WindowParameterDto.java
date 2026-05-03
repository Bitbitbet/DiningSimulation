package com.sim.canteen.dto;

import com.sim.canteen.enums.DishType;

public record WindowParameterDto(
        DishType dishType,
        double windowPrepTimeModifier) {
}
