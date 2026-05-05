package com.sim.canteen.simulation;

import com.sim.canteen.entity.CustomerEntity;
import com.sim.canteen.enums.DishType;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

public class CustomerArrival {
    /**
     * @return 在当前时间之前新到达的所有顾客
     */
    public static List<List<CustomerEntity>> next_until(SimulationData data) {
        while (data.nextCustomerGrpTime < data.time) {
            data.nextCustomerGrpTime += -Math.log(Math.random()) / data.customerGroupArriveRate;
            data.customerArriveTimes.add(data.nextCustomerGrpTime);
        }
        var map = data.customerArriveTimes
                .stream()
                .collect(Collectors.partitioningBy((i -> i <= data.time)));

        // 把当前时间之后的顾客到达时间存起来
        data.customerArriveTimes = map.get(false);

        return map.get(true)
                .stream()
                .map(arriveTime -> newCustomerGroup(data, arriveTime))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private static double randomEatSeconds(SimulationData data) {
        var sec = ThreadLocalRandom.current()
                .nextGaussian(data.para.customerEatSecondsAvg(), data.para.customerEatSecondsStdVar());
        if (sec <= 0)
            sec = data.para.customerEatSecondsAvg();

        return sec;
    }

    private static double randomDishPrepSeconds(SimulationData data) {
        var sec = ThreadLocalRandom.current()
                .nextGaussian(data.para.dishPrepSecondsAvg(), data.para.dishPrepTimeSecondsVar());
        if (sec <= 0)
            sec = data.para.dishPrepSecondsAvg();

        return sec;
    }

    private static List<CustomerEntity> newCustomerGroup(SimulationData data, double arriveTime) {
        var oneWeight = data.para.customerGroupSizeRatio().get(1);
        var twoWeight = data.para.customerGroupSizeRatio().get(2);
        var threeWeight = data.para.customerGroupSizeRatio().get(3);
        var fourWeight = data.para.customerGroupSizeRatio().get(4);
        var total = oneWeight + twoWeight + threeWeight + fourWeight;
        var choose = ThreadLocalRandom.current().nextInt(0, total);
        var groupSize = 4;
        do {
            if (choose < oneWeight) {
                groupSize = 1;
                break;
            }
            choose -= oneWeight;
            if(choose < twoWeight) {
                groupSize = 2;
                break;
            }
            choose -= twoWeight;
            if(choose < threeWeight) {
                groupSize = 3;
                break;
            }
        } while(false);
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
        var aWeight = data.para.customerDishRatio().get(DishType.A);
        var bWeight = data.para.customerDishRatio().get(DishType.B);
        var cWeight = data.para.customerDishRatio().get(DishType.C);
        var total = aWeight + bWeight + cWeight;
        var choose = ThreadLocalRandom.current().nextInt(0, total);
        if (choose < aWeight) {
            return DishType.A;
        }
        choose -= aWeight;
        if (choose < bWeight) {
            return DishType.B;
        }
        return DishType.C;
    }
}