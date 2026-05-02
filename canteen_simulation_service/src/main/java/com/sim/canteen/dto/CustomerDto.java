package com.sim.canteen.dto;

import com.sim.canteen.enums.CustomerStatus;
import com.sim.canteen.enums.DishType;

import java.util.Optional;

public record CustomerDto(
        int id,
        CustomerStatus status,
        Optional<Integer> queuingWindowId,
        double arriveTime,
        double eatTime,
        double dishPrepTime,
        DishType orderType
) {
}