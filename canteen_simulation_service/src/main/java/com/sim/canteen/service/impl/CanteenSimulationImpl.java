package com.sim.canteen.service.impl;

import com.sim.canteen.dto.*;
import com.sim.canteen.entity.CustomerEntity;
import com.sim.canteen.entity.WindowEntity;
import com.sim.canteen.service.CanteenSimulation;
import jakarta.annotation.Nullable;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

public class CanteenSimulationImpl implements CanteenSimulation {
    static final int TICK_PER_SECOND = 10;
    private final Object pauseLock = new Object();
    // 仿真历史
    private final List<HistoryPoint> history = new ArrayList<>();
    // 窗口实体
    private final List<WindowEntity> windows = new ArrayList<>();
    // 顾客实体
    private final HashMap<Integer, CustomerEntity> customers = new HashMap<>();
    // 顾客组索引
    private final HashMap<Integer, List<Integer>> customerGroups = new HashMap<>();

    private volatile boolean running = false;
    private volatile boolean shutdown = false;

    private SimulationData simulationData = null;

    private volatile double simulationSpeed;

    private volatile Instant lastUpdate;

    /**
     * Current time(in seconds) of the emulation
     */
    private volatile double time;

    public CanteenSimulationImpl() {
        // Start the worker thread
        new Thread(this::simulationThreadRun);
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
    public boolean resumeSimulation() {
        running = true;
        lastUpdate = Instant.now();

        synchronized (pauseLock) {
            pauseLock.notifyAll();
        }

        return true;
    }

    @Override
    public synchronized void getDashboardResponse() {
    }

    @Override
    public void selectSimulationData(SimulationParametersDto parameters) {
        this.windows.clear();
        for (var w : parameters.windows()) {
            this.windows.add(
                    new WindowEntity(w.dishType(),
                    w.windowPrepTimeModifier(),
                    new ArrayList<>())
            );
        }
        this.customers.clear();
        this.simulationData = new SimulationData(parameters);
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

            simulationThreadTick();
            lastUpdate = Instant.now();
        }
    }


    private synchronized void simulationThreadTick() {
        var timeLeap = Duration.between(Instant.now(), lastUpdate).toNanos() * simulationSpeed;
        time += timeLeap;
        var newCustomers = simulationData.next_until(time);
        // 新顾客，加到结尾，窗口排队
        for (var customerGroup : newCustomers) {
            for (var customer: customerGroup) {
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
        
    }

    @Override
    public StatusResponse getStatus() {
        return new StatusResponse(true);
    }
}
