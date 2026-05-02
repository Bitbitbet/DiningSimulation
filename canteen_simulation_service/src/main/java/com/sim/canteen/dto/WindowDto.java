package com.sim.canteen.dto;

import com.sim.canteen.enums.DishType;

import java.util.List;

public record WindowDto(
        int id,
        DishType dishType,
        List<Integer> queue
) {
}
