package com.sim.canteen.dto.response;

import com.sim.canteen.enums.DishType;

import java.util.List;

public record WindowDto(
        DishType dishType,
        List<Integer> queue
) {
}
