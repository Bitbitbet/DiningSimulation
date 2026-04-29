package com.hbjtu.canteen.dto;

import com.hbjtu.canteen.enums.CustomerStatus;
import com.hbjtu.canteen.enums.DishType;

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