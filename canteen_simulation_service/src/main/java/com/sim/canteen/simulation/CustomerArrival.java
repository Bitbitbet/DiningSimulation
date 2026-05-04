package com.sim.canteen.simulation;

import com.sim.canteen.entity.CustomerEntity;
import com.sim.canteen.enums.DishType;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

public class CustomerArrival {
    /**
     * @return 在这个时间节点之前新到达的所有顾客
     */
    public static List<List<CustomerEntity>> next_until(SimulationData data) {
        while(data.nextCustomerGrpTime < data.time) {
            data.nextCustomerGrpTime += -Math.log(Math.random()) / data.customerGroupArriveRate;
            data.customerArriveTimes.add(data.nextCustomerGrpTime);
        }
        var map = data.customerArriveTimes
                .stream()
                .collect(Collectors.partitioningBy((i -> i <= data.time)));

        // 把指定时间之后的顾客到达时间存起来
        data.customerArriveTimes = map.get(false);

        return map.get(true)
                .stream()
                .map(arriveTime -> newCustomerGroup(data, arriveTime))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private static double randomEatSeconds(SimulationData data) {
        return ThreadLocalRandom.current()
                .nextGaussian(data.para.customerEatTimeAvg(), data.para.customerEatTimeStdVar());
    }

    private static double randomDishPrepSeconds(SimulationData data) {
        return ThreadLocalRandom.current()
                .nextGaussian(data.para.dishPrepTimeAvg(), data.para.dishPrepTimeStdVar());
    }

    private static List<CustomerEntity> newCustomerGroup(SimulationData data, double arriveTime) {
        var v = ThreadLocalRandom.current().nextDouble();
        int groupSize;
        if (v < data.grpOneWeight) {
            groupSize = 1;
        } else if (v < data.grpOneWeight + data.grpTwoWeight) {
            groupSize = 2;
        } else if (v < data.grpOneWeight + data.grpTwoWeight + data.grpThreeWeight) {
            groupSize = 3;
        } else {
            groupSize = 4;
        }
        var groups = new ArrayList<CustomerEntity>();
        var groupId = data.customerGroupIdGenerator++;

        for (int i = 0; i < groupSize; ++i) {
            groups.add(new CustomerEntity(
                    data.customerIdGenerator++,
                    groupId,
                    groupSize,
                    randomDishPrepSeconds(data),
                    randomEatSeconds(data),
                    arriveTime,
                    randomDishType(data)
            ));
        }
        return groups;
    }

    private static DishType randomDishType(SimulationData data) {
        var choose = Math.random();
        int w = data.para.customerDishRatio().values().stream().reduce(0, Integer::sum);

        var base = 0.0;
        var rst = DishType.A;
        for (var entry : data.para.customerDishRatio().entrySet()) {
            var dishType = entry.getKey();
            var weight = entry.getValue();
            base += (double) weight / w;
            if (choose <= base) {
                rst = dishType;
                break;
            }
        }
        return rst;
    }
}