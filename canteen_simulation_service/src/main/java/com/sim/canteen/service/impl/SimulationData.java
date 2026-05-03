package com.sim.canteen.service.impl;

import com.sim.canteen.dto.CustomerDto;
import com.sim.canteen.dto.SimulationParametersDto;
import com.sim.canteen.entity.CustomerEntity;
import com.sim.canteen.enums.DishType;

import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

public class SimulationData {
    private final SimulationParametersDto parameters;
    private final double customerGroupArriveRate;
    private final double groupSizeOne;
    private final double groupSizeTwo;
    private final double groupSizeThree;
    private final double groupSizeFour;
    private List<Double> customerArriveTimes = new LinkedList<>();
    private int customerIdGenerator = 0;
    private int customerGroupIdGenerator = 0;

    public SimulationData(SimulationParametersDto simulationParameters) {
        this.parameters = simulationParameters;
        customerIdGenerator = 0;

        var ratio = simulationParameters.customerGroupSizeRatio();
        double totalWeight = ratio.get(1) + ratio.get(2) + ratio.get(3) + ratio.get(4);
        groupSizeOne = ratio.get(1) / totalWeight;
        groupSizeTwo = ratio.get(2) / totalWeight;
        groupSizeThree = ratio.get(3) / totalWeight;
        groupSizeFour = ratio.get(4) / totalWeight;
        double e = groupSizeOne + groupSizeTwo * 2 + groupSizeThree * 3 + groupSizeFour * 4;
        customerGroupArriveRate = simulationParameters.customerArriveRate() / e;
    }

    /**
     * @param time 指定的时间节点
     * @return 在这个时间节点之前新到达的所有顾客
     */
    public List<List<CustomerEntity>> next_until(double time) {
        double next = customerArriveTimes.isEmpty() ? 0 : customerArriveTimes.getLast();
        do {
            next += -Math.log(Math.random()) / customerGroupArriveRate;
            customerArriveTimes.add(next);
        } while (next <= time);
        var map = customerArriveTimes.stream().collect(Collectors.partitioningBy((i -> i <= time), Collectors.toCollection(LinkedList::new)));

        // 把指定时间之后的顾客到达时间存起来
        this.customerArriveTimes = map.get(false);

        return map.get(true)
                .stream()
                .map(this::newCustomerGroup
                ).collect(Collectors.toCollection(LinkedList::new));
    }

    private double randomEatSeconds() {
        return ThreadLocalRandom.current()
                .nextGaussian(parameters.customerEatTimeAvg(), parameters.customerEatTimeStdVar());
    }

    private double randomDishPrepSeconds() {
        return ThreadLocalRandom.current()
                .nextGaussian(parameters.dishPrepTimeAvg(), parameters.dishPrepTimeStdVar());
    }

    private List<CustomerEntity> newCustomerGroup(double arriveTime) {
        var v = ThreadLocalRandom.current().nextDouble();
        int groupSize;
        if (v < groupSizeOne) {
            groupSize = 1;
        } else if (v < groupSizeOne + groupSizeTwo) {
            groupSize = 2;
        } else if (v < groupSizeOne + groupSizeTwo + groupSizeThree) {
            groupSize = 3;
        } else {
            groupSize = 4;
        }
        var groups = new LinkedList<CustomerEntity>();
        var groupId = customerGroupIdGenerator++;

        for (int i = 0; i < groupSize; ++i) {
            groups.add(new CustomerEntity(
                    customerIdGenerator++,
                    groupId,
                    groupSize,
                    randomDishPrepSeconds(),
                    randomEatSeconds(),
                    arriveTime,
                    randomDishType()
            ));
        }
        return groups;
    }

    private DishType randomDishType() {
        var choose = Math.random();
        int w = parameters.customerDishRatio().values().stream().reduce(0, Integer::sum);

        var base = 0.0;
        var rst = DishType.A;
        for (var entry : parameters.customerDishRatio().entrySet()) {
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