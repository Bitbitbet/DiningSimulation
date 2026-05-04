package com.sim.canteen.dto.response;

import com.sim.canteen.enums.CustomerState;
import com.sim.canteen.enums.DishType;

public record CustomerDto(
        int id,
        int groupId,
        int groupSize,

        double simulatedDishPrepSeconds,
        double simulatedEatTimeSeconds,
        double arriveTime,
        DishType orderType,

        CustomerState status
) {
}