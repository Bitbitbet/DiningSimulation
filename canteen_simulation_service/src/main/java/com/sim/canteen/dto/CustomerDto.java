package com.sim.canteen.dto;

import com.sim.canteen.enums.CustomerStatus;
import com.sim.canteen.enums.DishType;

public record CustomerDto(
        int id,
        double arriveTime,
        DishType orderType,
        double prepTime,
        double eatTime,
        int windowId,
        double queueStart,
        double queueEnd,
        double eatStart,
        double leaveTime,
        CustomerStatus status
) {
}