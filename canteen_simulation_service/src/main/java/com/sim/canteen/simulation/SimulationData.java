package com.sim.canteen.simulation;

import com.sim.canteen.dto.request.SimulationParametersDto;
import com.sim.canteen.dto.response.HistoryPointDto;
import com.sim.canteen.dto.response.SimulationDataDto;
import com.sim.canteen.entity.CustomerEntity;
import com.sim.canteen.entity.SeatEntity;
import com.sim.canteen.entity.WindowEntity;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class SimulationData {
    public int id;
    public String name;
    public SimulationParametersDto para;
    public boolean finished = false;

    public double time = 0;

    // 仿真历史
    public final List<HistoryPointDto> historyPoints = new ArrayList<>();
    // 窗口实体
    public final List<WindowEntity> windows = new ArrayList<>();
    // 顾客实体
    public final HashMap<Integer, CustomerEntity> customers = new HashMap<>();
    // 座位实体
    public final List<SeatEntity> seats = new ArrayList<>();
    // 顾客组索引
    public final HashMap<Integer, List<Integer>> customerGroups = new HashMap<>();

    // 平均顾客等待座位时间
    public double customerWaitSeatSecAvg;
    // 平均顾客等待座位时间这一项统计的人数
    public int customerWaitSeatSampleCnt;

    // 吃饱离开的顾客总数
    public int leftCustomers;

    // 计算到达学生组率
    public final double customerGroupArriveRate;
    public final double grpOneWeight;
    public final double grpTwoWeight;
    public final double grpThreeWeight;

    public List<Double> customerArriveTimes = new ArrayList<>();
    public int customerIdGenerator = 0;
    public int customerGroupIdGenerator = 0;
    public double nextCustomerGrpTime = 0;

    public SimulationData(int id, String name, SimulationParametersDto parameters) {
        this.id = id;
        this.name = name;
        this.para = parameters;

        for (var w : parameters.windows()) {
            this.windows.add(
                    new WindowEntity(
                            w.dishType(),
                            w.windowPrepTimeModifier(),
                            new ArrayList<>(),
                            0.0
                    )
            );
        }
        for (int i = 0; i < parameters.seatCount(); i++) {
            this.seats.add(
                    new SeatEntity(
                            i,
                            new ArrayList<>(),
                            0.0,
                            0.0,
                            0.0,
                            0.0
                    )
            );
        }
        this.customerWaitSeatSecAvg = 0.0;
        this.customerWaitSeatSampleCnt = 0;
        this.leftCustomers = 0;

        var ratio = parameters.customerGroupSizeRatio();
        double totalWeight = ratio.get(1) + ratio.get(2) + ratio.get(3) + ratio.get(4);
        grpOneWeight = ratio.get(1) / totalWeight;
        grpTwoWeight = ratio.get(2) / totalWeight;
        grpThreeWeight = ratio.get(3) / totalWeight;
        double groupSizeFour = ratio.get(4) / totalWeight;
        double e = grpOneWeight + grpTwoWeight * 2 + grpThreeWeight * 3 + groupSizeFour * 4;
        customerGroupArriveRate = parameters.customerArriveRate() / e;
    }

    public SimulationDataDto dto() {
        return new SimulationDataDto(
                this.id,
                this.name
        );
    }
}