package com.sim.canteen.dto.response;

public record HistoryPointDto(
        // 时间点
        double time,
        // 平均队列长度，时间点计算
        double averageQueueLength,
        // 平均顾客等待座位时长，这个得累积计算
        double averageCustomerWaitSeatSeconds,
        // 厨师利用率，或者窗口利用率，时间点计算
        double chefUtilization,
        // 座位周转率，累积计算
        double seatTurnover,
        // 座位空置率，时间点计算
        double seatIdleRate,
        // 堵塞率，等待座位的人数/座位总数(乘上每个座位的人数的座位总数)，时间点计算
        double congestionRate
) {

    // ===================== 【新增：清理 NaN 方法】 =====================
    public HistoryPointDto cleanNaN() {
        return new HistoryPointDto(
                this.time,
                fix(this.averageQueueLength),
                fix(this.averageCustomerWaitSeatSeconds),
                fix(this.chefUtilization),
                fix(this.seatTurnover),
                fix(this.seatIdleRate),
                fix(this.congestionRate)
        );
    }

    // 把 NaN / 无穷大 变成 0.0
    private double fix(double val) {
        if (Double.isNaN(val) || Double.isInfinite(val)) {
            return 0.0;
        }
        return val;
    }
    // ==================================================================
}