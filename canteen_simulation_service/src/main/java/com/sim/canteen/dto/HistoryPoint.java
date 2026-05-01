package com.sim.canteen.dto;

public record HistoryPoint(
        double time,
        double queueLength,
        double waitMinutes,
        double chefUtilization,
        double seatTurnoverRate,
        double seatIdleRate,
        double congestionRate
        ) {
}
