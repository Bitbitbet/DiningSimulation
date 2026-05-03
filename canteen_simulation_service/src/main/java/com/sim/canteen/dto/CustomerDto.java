package com.sim.canteen.dto;

import com.sim.canteen.enums.CustomerStatus;
import com.sim.canteen.enums.DishType;

import java.util.List;
import java.util.Optional;

public record CustomerDto(
        int id,
        int groupId,
        int groupSize,

        double simulatedDishPrepSeconds,
        double simulatedEatTimeSeconds,
        double arriveTime,
        DishType orderType,

        CustomerStatus status
) {
}