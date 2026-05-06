package com.sim.canteen.service.impl;

import com.sim.canteen.dto.response.DashboardResponse;
import com.sim.canteen.dto.response.HistoryPointDto;
import com.sim.canteen.dto.response.HistoryResponse;
import com.sim.canteen.dto.response.StatusResponse;
import com.sim.canteen.entity.SeatEntity;
import com.sim.canteen.enums.CustomerState;
import com.sim.canteen.enums.SimulationState;
import com.sim.canteen.service.CanteenSimulation;
import com.sim.canteen.simulation.CustomerArrival;
import com.sim.canteen.simulation.SimulationData;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CanteenSimulationImpl implements CanteenSimulation {
    static final int TICK_PER_SECOND = 10;
    private final Object pauseLock = new Object();

    private volatile boolean running = false;
    private volatile boolean shutdown = false;
    private volatile double simulationSpeed = 1;
    private volatile SimulationData data = null;

    private volatile Instant lastUpdate;

    public CanteenSimulationImpl() {
        // Start the worker thread
        new Thread(this::simulationThreadRun).start();
    }

    @Override
    public void pauseSimulation() {
        running = false;
        synchronized (pauseLock) {
            pauseLock.notifyAll();
        }
    }

    @Override
    public boolean resumeSimulation() {
        if (data == null) {
            return false;
        }
        if (data.finished) {
            return false;
        }
        if (running) {
            return true;
        }
        running = true;
        lastUpdate = Instant.now();

        synchronized (pauseLock) {
            pauseLock.notifyAll();
        }

        return true;
    }

    @Override
    public synchronized void setSimulationData(SimulationData simulationData) {
        if (simulationData == null) {
            running = false;
        }
        this.data = simulationData;
    }

    @Override
    public synchronized DashboardResponse getDashboardResponse() {
        var simulationState = running ? SimulationState.started :
                (shutdown || data == null ? SimulationState.pending : SimulationState.paused);

        if (data == null) {
            return new DashboardResponse(
                    simulationState,
                    new HistoryPointDto(
                            0.0, 0.0,
                            0.0, 0.0,
                            0.0, 0.0, 0.0
                    ),
                    false,
                    List.of(),
                    List.of()
            );
        }

        HistoryPointDto latestHistory;
        if (data.historyPoints.isEmpty()) {
            latestHistory = new HistoryPointDto(
                    0.0, 0.0,
                    0.0, 0.0,
                    0.0, 0.0, 0.0
            );
        } else {
            latestHistory = data.historyPoints.getLast();
        }

        return new DashboardResponse(
                simulationState,
                latestHistory,
                data.finished,
                data.windows
                        .stream()
                        .map(window -> window.queue.size())
                        .collect(Collectors.toCollection(ArrayList::new)),
                data.seats
                        .stream()
                        .map(seat -> seat.customers.size()).collect(Collectors.toCollection(ArrayList::new))
        );
    }

    @Override
    public synchronized HistoryResponse getRecentHistory(int limit, int begin) {
        if (data == null) {
            throw new RuntimeException("Data is null");
        }
        var size = data.historyPoints.size();
        if (begin >= size) {
            return new HistoryResponse(
                    List.of(),
                    size,
                    0,
                    false
            );
        }
        begin = Math.max(size - limit, begin);
        return new HistoryResponse(
                data.historyPoints.subList(begin, size),
                begin,
                size - begin,
                false
        );
    }

    @Override
    public synchronized HistoryResponse getRangeHistory(int begin, int count) {
        if(data == null) {
            throw new RuntimeException("Data is null");
        }
        var size = data.historyPoints.size();
        if (begin >= size) {
            return new HistoryResponse(
                    List.of(),
                    size,
                    0,
                    false
            );
        }
        var hasMore = true;
        if (begin + count >= size) {
            count = size - begin;
            hasMore = false;
        }
        return new HistoryResponse(
                data.historyPoints.subList(begin, begin + count),
                begin,
                count,
                hasMore
        );
    }

    @Override
    public void shutdown() {
        shutdown = true;
        running = false;
        synchronized (pauseLock) {
            pauseLock.notifyAll();
        }
    }

    @Override
    public void setSimulationSpeed(double speed) {
        this.simulationSpeed = speed;
    }

    @Override
    public StatusResponse getStatus() {
        return new StatusResponse(true);
    }

    private void simulationThreadRun() {
        // 工作线程主循环
        while (true) {
            try {
                var TIME = 1_000_000_000 / TICK_PER_SECOND;
                Thread.sleep(Duration.ofNanos(TIME));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }

            // 检查运行状态
            synchronized (pauseLock) {
                while (!running && !shutdown) {
                    try {
                        pauseLock.wait();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                }
            }
            // shutdown为true，退出
            if (shutdown) {
                return;
            }

            var timeLeap = ((double) Duration.between(lastUpdate, Instant.now()).toNanos() / 1_000_000_000) * simulationSpeed;
            data.time += timeLeap;
            if (data.time >= data.para.simulationTotalMinutes() * 60) {
                data.time = data.para.simulationTotalMinutes() * 60;
                data.finished = true;
            }
            simulationThreadTick();
            lastUpdate = Instant.now();
            if (data.finished) {
                running = false;
            }
        }
    }


    private synchronized void simulationThreadTick() {
        var newCustomers = CustomerArrival.next_until(data);
        // 新顾客，加到结尾，窗口排队
        for (var customerGroup : newCustomers) {
            for (var customer : customerGroup) {
                data.customers.put(customer.id, customer);
                var minWindow = data.windows.stream()
                        .filter(windowEntity -> windowEntity.dishType == customer.orderType)
                        .min(Comparator.comparingInt(a -> a.queue.size())).get();

                minWindow.queue.add(customer.id);

                data.customerGroups.putIfAbsent(customer.groupId, new ArrayList<>());
                data.customerGroups.get(customer.groupId).add(customer.id);
            }
        }

        // 处理窗口的第一位
        while (true) {
            boolean recheck = false;
            for (var window : data.windows) {
                if (!window.queue.isEmpty()) {
                    var servingCustomer = data.customers.get(window.queue.getFirst());
                    // 排队的第一位开始等待食物
                    if (servingCustomer.state == CustomerState.Queuing) {
                        // 顾客切换到等待食物状态
                        servingCustomer.state = CustomerState.WaitingForDish;

                        servingCustomer.dishPrepEndTime =
                                Math.max(servingCustomer.arriveTime, window.freeSince)
                                        + servingCustomer.simulatedDishPrepSeconds * window.windowPrepTimeModifier;
                    }
                    // 排队的第一位检查食物是否完成
                    if (servingCustomer.state == CustomerState.WaitingForDish) {
                        // 顾客食物完成
                        if (servingCustomer.dishPrepEndTime <= data.time) {
                            servingCustomer.state = CustomerState.WaitingForGroup;
                            window.queue.removeFirst();
                            window.freeSince = servingCustomer.dishPrepEndTime;
                            recheck = true;
                        }
                    }
                }
            }
            if (!recheck) break;
        }
        // 处理等待组员的顾客
        for (var customer : data.customers.values()) {
            if (customer.state == CustomerState.WaitingForGroup) {
                var group = data.customerGroups
                        .get(customer.groupId).stream().map(data.customers::get).collect(Collectors.toCollection(ArrayList::new));
                if (group.stream()
                        .allMatch(customerEntity -> customerEntity.state == CustomerState.WaitingForGroup)) {
                    // 所有人都已经拿到食物
                    var lastCustomerToGetFood = group.stream()
                            .max(Comparator.comparingDouble(customerEntity -> customerEntity.dishPrepEndTime));
                    var startWaitingForSeatTime = lastCustomerToGetFood.get().dishPrepEndTime;

                    group.forEach(customerEntity -> {
                        customerEntity.state = CustomerState.WaitingForSeat;
                        customerEntity.startWaitingForSeatTime = startWaitingForSeatTime;
                    });
                }
            }
        }
        while (true) {
            boolean recheck = false;
            // 处理所有的顾客离开，食物吃完
            for (var iter = data.customers.entrySet().iterator(); iter.hasNext(); ) {
                var customer = iter.next().getValue();
                if (customer.state == CustomerState.Eating) {
                    if (customer.eatEndTime <= data.time) {
                        // 检查组，删除组
                        var group = data.customerGroups.get(customer.groupId);
                        group.removeIf(i -> i == customer.id);
                        if (group.isEmpty()) {
                            data.customerGroups.remove(customer.groupId);
                        }

                        var seat = data.seats.get(customer.seatId);
                        seat.customers.removeIf(i -> i == customer.id);
                        switch (seat.customers.size()) {
                            case 0:
                                seat.fourFreeSince = customer.eatEndTime;
                            case 1:
                                seat.threeFreeSince = customer.eatEndTime;
                            case 2:
                                seat.twoFreeSince = customer.eatEndTime;
                            case 3:
                                seat.oneFreeSince = customer.eatEndTime;
                        }
                        // 最后删除这个顾客
                        iter.remove();
                        ++data.leftCustomers;
                    }
                }
            }
            // 处理所有的座位请求
            var waiting_seat_customer_groups = data.customers
                    .values().stream()
                    .filter(customer -> customer.state == CustomerState.WaitingForSeat)
                    .sorted(Comparator.comparingDouble(customerEntity -> customerEntity.startWaitingForSeatTime))
                    .map(customer -> customer.groupId)
                    .collect(Collectors.toCollection(HashSet::new));

            var seatsByOccupation = data.seats.stream().collect(Collectors.groupingBy(seat -> seat.customers.size()));
            var seatsOfThree = seatsByOccupation.getOrDefault(3, List.of());
            var seatsOfTwo = seatsByOccupation.getOrDefault(2, List.of());
            var seatsOfOne = seatsByOccupation.getOrDefault(1, List.of());
            var seatsOfZero = seatsByOccupation.getOrDefault(0, List.of());
            for (var customerGroupId : waiting_seat_customer_groups) {
                SeatEntity seat = null;
                double seatFreeSince = 0;
                var group = data.customerGroups.get(customerGroupId);
                switch (group.size()) {
                    case 1:
                        if (!seatsOfThree.isEmpty()) {
                            seat = seatsOfThree.removeLast();
                            seatFreeSince = seat.oneFreeSince;
                            break;
                        }
                    case 2:
                        if (!seatsOfTwo.isEmpty()) {
                            seat = seatsOfTwo.removeLast();
                            seatFreeSince = seat.twoFreeSince;
                            break;
                        }
                    case 3:
                        if (!seatsOfOne.isEmpty()) {
                            seat = seatsOfOne.removeLast();
                            seatFreeSince = seat.threeFreeSince;
                            break;
                        }
                    case 4:
                        if (!seatsOfZero.isEmpty()) {
                            seat = seatsOfZero.removeLast();
                            seatFreeSince = seat.fourFreeSince;
                            break;
                        }
                }
                if (seat != null) {
                    recheck = true;
                    for (var customerId : group) {
                        var customer = data.customers.get(customerId);
                        double takeSeatTime = Math.max(seatFreeSince, customer.startWaitingForSeatTime);
                        seat.customers.add(customerId);
                        customer.seatId = seat.id;
                        customer.state = CustomerState.Eating;
                        customer.eatEndTime = takeSeatTime + customer.simulatedEatTimeSeconds;
                        var waitForSeatSeconds = takeSeatTime - customer.startWaitingForSeatTime;

                        // 累积计算顾客等待座位时长的平均
                        data.leftCustomerWaitSeatSecAvg =
                                (data.leftCustomerWaitSeatSecAvg * data.leftCustomerWaitSeatSampleCnt + waitForSeatSeconds)
                                        / (data.leftCustomerWaitSeatSampleCnt + 1);
                        data.leftCustomerWaitSeatSampleCnt += 1;
                    }
                }
            }
            if (!recheck) break;
        }
        var historyPoint = calculateHistoryPoint();
        data.historyPoints.add(historyPoint);
    }

    private HistoryPointDto calculateHistoryPoint() {
        // 计算平均队列长度
        int queueLength = 0;
        int busyWindows = 0;
        for (var window : data.windows) {
            queueLength += window.queue.size();
            if (!window.queue.isEmpty()) {
                busyWindows++;
            }
        }
        double averageQueueLength = (double) queueLength / data.windows.size();
        double chefUtilization = (double) busyWindows / data.windows.size();
        double seatTurnover = 0;
        if (data.time != 0) {
            seatTurnover = (double) data.leftCustomers / data.time / (data.seats.size() * 4);
        }

        // 计算空置的座位
        int idleSeats = 0;
        for (var seat : data.seats) {
            idleSeats += 4 - seat.customers.size();
        }
        double seatIdleRate = (double) idleSeats / (data.seats.size() * 4);

        int waitingSeatsCustomers = 0;
        double currentWaitSeatSecsTotal = 0.0;
        for (var customer : data.customers.values()) {
            if (customer.state == CustomerState.WaitingForSeat) {
                waitingSeatsCustomers++;
                currentWaitSeatSecsTotal += data.time - customer.startWaitingForSeatTime;
            }
        }
        double averageCustomerWaitSeatSeconds = (
                data.leftCustomerWaitSeatSecAvg * data.leftCustomerWaitSeatSampleCnt
                        + currentWaitSeatSecsTotal) / (data.leftCustomerWaitSeatSampleCnt + waitingSeatsCustomers);
        double congestionRate = (double) waitingSeatsCustomers / (data.seats.size() * 4);


        return new HistoryPointDto(
                data.time,
                averageQueueLength,
                averageCustomerWaitSeatSeconds,
                chefUtilization,
                seatTurnover,
                seatIdleRate,
                congestionRate
        );
    }
}
