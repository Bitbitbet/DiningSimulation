package com.sim.canteen.dto;

public record HistoryPoint(
        // 时间点
        double time,
        // 平均队列长度，时间点计算
        double averageQueueLength,
        // 平均顾客等待时长，这个得累积计算
        double averageCustomerWaitMinutes,
        // 厨师利用率，或者窗口利用率，时间点计算
        double chefUtilization,
        // 座位周转率，累积计算
        double seatTurnover,
        // 座位空置率，时间点计算
        double seatIdleRate,
        // 堵塞率，等待组员、座位的人数，时间点计算
        double congestionRate
        ) {
}
