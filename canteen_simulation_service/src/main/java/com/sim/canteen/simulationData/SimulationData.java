package com.sim.canteen.simulationData;

import com.sim.canteen.dto.CustomerDto;
import com.sim.canteen.dto.SimulationParametersDto;
import com.sim.canteen.enums.CustomerStatus;
import com.sim.canteen.enums.DishType;

import java.util.LinkedList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

public class SimulationData {
    private Optional<SimulationParametersDto> parameters = Optional.empty();
    private List<Double> cachedCustomer = new LinkedList<>();
    private int customerIdGenerator = 0;

    public SimulationData() {
    }

    public List<CustomerDto> next_until(double time) {
        double next = cachedCustomer.isEmpty() ? 0 : cachedCustomer.getLast();
        do {
            next += -Math.log(Math.random()) / parameters.get().customerArrivalRate();


        } while (next <= time);
        var map = cachedCustomer.stream().collect(Collectors.partitioningBy((i -> i <= time), Collectors.toCollection(LinkedList::new)));

        this.cachedCustomer = map.get(false);


        return map.get(true)
                .stream()
                .map(arriveTime ->
                        new CustomerDto(
                                customerIdGenerator++,
                                CustomerStatus.Queuing,
                                Optional.empty(),
                                arriveTime,
                                ThreadLocalRandom.current()
                                        .nextGaussian(parameters.get().customerEatTimeAvg(), parameters.get().customerEatTimeStdVar()),
                                randomDishType())
                ).collect(Collectors.toCollection(LinkedList::new));
    }

    private DishType randomDishType() {
        var choose = Math.random();
        var w = parameters.get().customerDishRatio().values().stream().reduce(0, Integer::sum).intValue();

        var base = 0.0;
        var rst = DishType.A;
        for (var entry : parameters.get().customerDishRatio().entrySet()) {
            var dishType = entry.getKey();
            var weight = entry.getValue();
            base += (double) weight / w;
            if (choose <= base) {
                rst = dishType;
            }
        }
        return rst;
    }


    public void select(SimulationParametersDto simulationParameters) {
        this.parameters = Optional.ofNullable(simulationParameters);
        customerIdGenerator = 0;
        cachedCustomer.clear();
    }
}