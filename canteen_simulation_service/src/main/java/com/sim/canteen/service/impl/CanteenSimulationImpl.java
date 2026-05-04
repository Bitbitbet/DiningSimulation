package com.sim.canteen.service.impl;

import com.sim.canteen.dto.HistoryPoint;
import com.sim.canteen.dto.SimulationParametersDto;
import com.sim.canteen.dto.StatusResponse;
import com.sim.canteen.entity.CustomerEntity;
import com.sim.canteen.entity.SeatEntity;
import com.sim.canteen.entity.WindowEntity;
import com.sim.canteen.enums.CustomerState;
import com.sim.canteen.service.CanteenSimulation;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CanteenSimulationImpl implements CanteenSimulation {
    static final int TICK_PER_SECOND = 10;
    private final Object pauseLock = new Object();
    // 仿真历史
    private final List<HistoryPoint> history = new ArrayList<>();
    // 窗口实体
    private final List<WindowEntity> windows = new ArrayList<>();
    // 顾客实体
    private final HashMap<Integer, CustomerEntity> customers = new HashMap<>();
    // 座位实体
    private final List<SeatEntity> seats = new ArrayList<>();
    // 顾客组索引
    private final HashMap<Integer, List<Integer>> customerGroups = new HashMap<>();

    private volatile boolean running = false;
    private volatile boolean shutdown = false;

    private CustomerArrival simulationData = null;

    private volatile double simulationSpeed;

    private volatile Instant lastUpdate;

    /**
     * Current time(in seconds) of the emulation
     */
    private volatile double time;

    public CanteenSimulationImpl() {
        resetSimulation();
        // Start the worker thread
        new Thread(this::simulationThreadRun).start();
    }

    public void resetSimulation() {
        running = false;
        shutdown = false;
        time = 0;
        simulationSpeed = 1;
    }

    @Override
    public void pauseSimulation() {
        running = false;
        synchronized (pauseLock) {
            pauseLock.notifyAll();
        }
    }

    @Override
    public void resumeSimulation() {
        running = true;
        lastUpdate = Instant.now();

        synchronized (pauseLock) {
            pauseLock.notifyAll();
        }
    }

    @Override
    public synchronized void getDashboardResponse() {
    }

    @Override
    public void selectSimulationData(SimulationParametersDto parameters) {
        this.windows.clear();
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
        this.customers.clear();
        this.simulationData = new CustomerArrival(parameters);
    }

    @Override
    public void shutdown() {
        shutdown = true;
        running = false;
        synchronized (pauseLock) {
            pauseLock.notifyAll();
        }
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
                while (!running || !shutdown) {
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

            var timeLeap = Duration.between(Instant.now(), lastUpdate).toNanos() * simulationSpeed;
            time += timeLeap;
            simulationThreadTick();
            lastUpdate = Instant.now();
        }
    }


    private synchronized void simulationThreadTick() {
        var newCustomers = simulationData.next_until(time);
        // 新顾客，加到结尾，窗口排队
        for (var customerGroup : newCustomers) {
            for (var customer : customerGroup) {
                customers.put(customer.id, customer);
                var minWindow = this.windows.stream()
                        .filter(windowEntity -> windowEntity.dishType == customer.orderType)
                        .min(Comparator.comparingInt(a -> a.queue.size())).get();

                minWindow.queue.add(customer.id);

                customerGroups.putIfAbsent(customer.groupId, new ArrayList<>());
                customerGroups.get(customer.groupId).add(customer.id);
            }
        }

        // 处理窗口的第一位
        while (true) {
            boolean recheck = false;
            for (var window : windows) {
                if (!window.queue.isEmpty()) {
                    var servingCustomer = customers.get(window.queue.getFirst());
                    // 排队的第一位开始等待食物
                    if (servingCustomer.status == CustomerState.Queuing) {
                        // 顾客切换到等待食物状态
                        servingCustomer.status = CustomerState.WaitingForDish;
                        servingCustomer.dishPrepEndTime =
                                window.freeSince + servingCustomer.simulatedDishPrepSeconds * window.windowPrepTimeModifier;
                    }
                    // 排队的第一位检查食物是否完成
                    if (servingCustomer.status == CustomerState.WaitingForDish) {
                        // 顾客食物完成
                        if (servingCustomer.dishPrepEndTime <= time) {
                            servingCustomer.status = CustomerState.WaitingForGroup;
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
        for (var customer : customers.values()) {
            if (customer.status == CustomerState.WaitingForGroup) {
                var group = customerGroups.get(customer.id).stream().map(customers::get).collect(Collectors.toCollection(ArrayList::new));
                if (group.stream()
                        .allMatch(customerEntity -> customerEntity.status == CustomerState.WaitingForGroup)) {
                    // 所有人都已经拿到食物
                    var lastCustomerToGetFood = group.stream()
                            .max(Comparator.comparingDouble(customerEntity -> customerEntity.dishPrepEndTime));
                    var startWaitingForSeatTime = lastCustomerToGetFood.get().dishPrepEndTime;

                    group.forEach(customerEntity -> {
                        customerEntity.status = CustomerState.WaitingForSeat;
                        customerEntity.startWaitingForSeatTime = startWaitingForSeatTime;
                    });
                }
            }
        }
        while (true) {
            boolean recheck = false;
            // 处理所有的顾客离开，食物吃完
            for (var iter = customers.entrySet().iterator(); iter.hasNext();) {
                var customer = iter.next().getValue();
                if (customer.status == CustomerState.Eating) {
                    if(customer.eatEndTime <= time) {
                        // 检查组，删除组
                        var group = customerGroups.get(customer.groupId);
                        group.remove(customer.id);
                        if(group.isEmpty()) {
                            customerGroups.remove(customer.groupId);
                        }

                        var seat = seats.get(customer.seatId);
                        seat.customers.remove(customer.id);
                        switch(seat.customers.size()) {
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
                    }
                }
            }
            // 处理所有的座位请求
            var waiting_seat_customers = customers
                    .values().stream()
                    .filter(customer -> customer.status == CustomerState.WaitingForSeat)
                    .sorted(Comparator.comparingDouble(customerEntity -> customerEntity.startWaitingForSeatTime))
                    .collect(Collectors.toCollection(ArrayList::new));

            var seatsByOccupation = seats.stream().collect(Collectors.groupingBy(seat -> seat.customers.size()));
            for (var customer : waiting_seat_customers) {
                SeatEntity seat = null;
                double seatFreeSince = 0;
                switch(customer.groupSize) {
                    case 1:
                        if(!seatsByOccupation.get(3).isEmpty()) {
                            seat = seatsByOccupation.get(3).removeLast();
                            seatFreeSince = seat.oneFreeSince;
                            break;
                        }
                    case 2:
                        if(!seatsByOccupation.get(2).isEmpty()) {
                            seat = seatsByOccupation.get(3).removeLast();
                            seatFreeSince = seat.twoFreeSince;
                            break;
                        }
                    case 3:
                        if(!seatsByOccupation.get(1).isEmpty()) {
                            seat = seatsByOccupation.get(3).removeLast();
                            seatFreeSince = seat.threeFreeSince;
                            break;
                        }
                    case 4:
                        if(!seatsByOccupation.get(0).isEmpty()) {
                            seat = seatsByOccupation.get(3).removeLast();
                            seatFreeSince = seat.fourFreeSince;
                            break;
                        }
                }
                if(seat != null) {
                    recheck = true;
                    for(var inGroupCustomerId: customerGroups.get(customer.groupId)) {
                        var inGroupCustomer = customers.get(inGroupCustomerId);
                        seat.customers.add(inGroupCustomerId);
                        inGroupCustomer.status = CustomerState.Eating;
                        inGroupCustomer.eatEndTime = seatFreeSince + inGroupCustomer.simulatedEatTimeSeconds;
                    }
                }
            }
            if(!recheck) break;
        }
    }

    @Override
    public StatusResponse getStatus() {
        return new StatusResponse(true);
    }
}
