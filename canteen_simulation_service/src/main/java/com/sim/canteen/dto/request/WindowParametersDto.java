package com.sim.canteen.dto.request;

import com.sim.canteen.enums.DishType;

public record WindowParametersDto(
        DishType dishType,
        double windowPrepTimeModifier
) {
}
