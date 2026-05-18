package com.sim.canteen.entity;

import lombok.Data;

@Data
public class SimulationDataPO {
    private Integer id;
    private String name;
    private Boolean finished;
    private Double time;

    // 统计字段
    private Double leftCustomerWaitSeatSecAvg;
    private Integer leftCustomerWaitSeatSampleCnt;
    private Integer leftCustomers;

    // 运行时生成器
    private Double customerGroupArriveRate;
    private Integer customerIdGenerator;
    private Integer customerGroupIdGenerator;
    private Double nextCustomerGrpTime;

    // 仿真参数 JSON
    private String parametersJson;
}