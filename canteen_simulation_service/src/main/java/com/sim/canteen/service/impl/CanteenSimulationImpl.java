package com.sim.canteen.service.impl;

import com.sim.canteen.dto.*;
import com.sim.canteen.service.CanteenSimulation;
import com.sim.canteen.simulationData.SimulationData;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

public class CanteenSimulationImpl implements CanteenSimulation {
    private volatile boolean running = false;
    private volatile boolean shutdown = false;
    private final Object pauseLock = new Object();

    static final int TICK_PER_SECOND = 10;

    // 仿真历史
    private final List<HistoryPoint> history = new ArrayList<>();
    // 窗口模拟数据
    private final List<WindowDto> windows = new ArrayList<>();
    // 厨师模拟数据
    private final List<ChefDto> chefs = new ArrayList<>();
    // 座位模拟数据
    private final List<SeatDto> seats = new ArrayList<>();
    // 顾客模拟数据
    private final List<CustomerDto> customers = new ArrayList<>();

    private final SimulationData simulationData = new SimulationData();

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
    public void getDashboardResponse() {}

    @Override
    public void selectSimulationData(SimulationParametersDto parameters) {
        this.windows.clear();
        for(int i = 0; i < parameters.windowCount(); ++i) {
            this.windows.add(new CanteenWindow(i));
        }

        this.chefs.clear();
        for(int i = 0; i < parameters.chefCount(); ++i) {
            this.chefs.add(new ChefDto(i, Optional.empty(), Optional.empty()));
        }

        this.seats.clear();
        for(int i = 0; i < parameters.seatCount(); ++i) {
            this.seats.add(new SeatDto(i, Optional.empty()));
        }
        this.customers.clear();
        this.simulationData.select(parameters);
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
        while(true) {
            try {
                var TIME = 1_000_000_000 / TICK_PER_SECOND;
                var millis = TIME % 1000;
                var nanos = TIME / 1000;
                Thread.sleep(millis, nanos);

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


    private void simulationThreadTick() {
        var timeLeap = Duration.between(Instant.now(),lastUpdate).toNanos() * simulationSpeed;
        time += timeLeap;
        var newCustomers = simulationData.next_until(time);
        // 新顾客，加到结尾，窗口排队
        for(var customer: newCustomers) {
            var minWindow = this.windows.stream()
                    .min(Comparator.comparingInt(a -> a.queue.size())).get();
            minWindow.queue.add(customer.id());
            customers.add(customer);
        }

        // 处理窗口，检查已完成的餐品

    }

    @Override
    public StatusResponse getStatus() {
        return new StatusResponse(true);
    }
}
