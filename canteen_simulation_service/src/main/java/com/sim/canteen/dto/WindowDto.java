package com.sim.canteen.dto;

import com.sim.canteen.enums.DishType;

import java.util.List;

public record WindowDto(
        int id,
        int chefId,
        boolean busy,
        double serveRate,
        List<Integer> queue,
        DishType dishType,
        int estimatedWaitMinutes) {
}
