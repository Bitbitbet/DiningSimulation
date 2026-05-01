package com.sim.canteen.service.impl;

import com.sim.canteen.dto.*;
import com.sim.canteen.service.CanteenSimulation;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.atomic.AtomicInteger;

public class CanteenSimulationImpl implements CanteenSimulation {
    private volatile boolean running;
    private volatile boolean shutdown;
    private final Object pauseLock = new Object();

    public CanteenSimulationImpl() {
        running = false;
        shutdown = false;
        // Start the worker thread
        new Thread(this::workerRun);
    }

    @Override
    public boolean updateTickPerSecond(int tickPerSecond) {
        this.tickPerSecond = tickPerSecond;

        return true;
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
    public DashboardResponse getDashboardResponse() {}

    @Override
    public void shutdown() {
        shutdown = true;
        running = false;
        synchronized (pauseLock) {
            pauseLock.notifyAll();
        }
    }

    private volatile int tickPerSecond = 0;
    private volatile Instant lastUpdate;
    private void workerRun() {
        // 工作线程主循环
        while(true) {
            try {
                Thread.sleep(0, 1_000_000_000 / tickPerSecond);
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

            workerTick();
            lastUpdate = Instant.now();
        }
    }


    // 随机数生成器
    private final Random random = new Random(42);
    // 顾客ID生成器
    private final AtomicInteger customerIdGenerator = new AtomicInteger(1000);

    // 仿真历史
    private final List<HistoryPoint> history = new ArrayList<>();
    // 窗口模拟数据
    private final List<WindowDto> windows = new ArrayList<>();
    // 厨师模拟数据
    private final List<ChefDto> chefs = new ArrayList<>();
    // 座位模拟数据
    private final List<SeatDto> seats = new ArrayList<>();
    // 顾客模拟数据
    private final List<CustomerDto> recentCustomers = new ArrayList<>();

    private double simulationSpeed = 0;

    private void workerTick() {
        var timeLeap = Duration.between(Instant.now(),lastUpdate).toNanos() * simulationSpeed;
        // TODO
    }

    @Override
    public StatusResponse getStatus() {
        return new StatusResponse(true);
    }

    public synchronized DashboardResponse getDashboard() {
    }

    @Override
    public synchronized DashboardResponse generateNewSimulationData(SimulationParametersDto parameters) {
    }
}
