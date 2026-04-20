package com.hbjtu.canteen.service.impl;

import com.hbjtu.canteen.dto.ChefDto;
import com.hbjtu.canteen.dto.CustomerDto;
import com.hbjtu.canteen.dto.DashboardResponse;
import com.hbjtu.canteen.dto.ReservationRequest;
import com.hbjtu.canteen.dto.ReservationResponse;
import com.hbjtu.canteen.dto.SeatDto;
import com.hbjtu.canteen.dto.SimulationParametersDto;
import com.hbjtu.canteen.dto.StatusResponse;
import com.hbjtu.canteen.dto.WindowDto;
import com.hbjtu.canteen.service.CanteenService;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;



@Service
public class CanteenServiceImpl implements CanteenService {
    // 随机数生成器
    private final Random random = new Random(42);
    // 顾客ID生成器
    private final AtomicInteger customerIdGenerator = new AtomicInteger(1000);
    // 仿真历史
    private final List<Map<String, Object>> history = new ArrayList<>();
    // 窗口模拟数据
    private final List<WindowDto> windows = new ArrayList<>();
    // 厨师模拟数据
    private final List<ChefDto> chefs = new ArrayList<>();
    // 座位模拟数据
    private final List<SeatDto> seats = new ArrayList<>();
    // 顾客模拟数据
    private final List<CustomerDto> recentCustomers = new ArrayList<>();
    // 仿真参数，由前端设置
    private SimulationParametersDto parameters = new SimulationParametersDto();
    // 当前模拟的开始状态
    private String simulationState = "未开始";

    // 实时模拟参数
    private double simulationSpeed = 1.0;
    private int currentTimeMinute = 0;
    private double averageQueueLength = 0.0;
    private double averageWaitMinutes = 0.0;
    private double chefUtilization = 0.0;
    private double seatTurnoverRate = 0.0;
    private double seatIdleRate = 0.0;
    private double congestionRate = 0.0;

    @PostConstruct
    public void init() {
        resetSimulation();
    }

    @Override
    public StatusResponse getStatus() {
        return new StatusResponse(true, "back_canteen_bjtu", "后端服务运行正常");
    }

    @Override
    public synchronized DashboardResponse getDashboard() {
        if ("运行中".equals(simulationState)) {
            tick();
        }
        return buildDashboard();
    }

    @Override
    public synchronized ReservationResponse estimateReservation(ReservationRequest request) {
        WindowDto bestWindow = windows.stream().min(Comparator.comparingInt(w -> w.getQueue().size())).orElse(windows.get(0));
        int estimatedWait = bestWindow.getEstimatedWaitMinutes() + Math.max(0, request.getPartySize() - 1) * 2;
        int freeSeats = (int) seats.stream().filter(seat -> seat.getOccupiedBy() == null).count();
        String suggestion = freeSeats >= request.getPartySize()
                ? "当前可安排座位，建议按推荐窗口取餐。"
                : "座位较紧张，建议错峰或等待座位释放。";
        return new ReservationResponse(request.getStudentId(), bestWindow.getId(), estimatedWait, bestWindow.getQueue().size() + 1, freeSeats, suggestion, false);
    }

    @Override
    public synchronized ReservationResponse confirmReservation(ReservationRequest request) {
        ReservationResponse estimate = estimateReservation(request);
        WindowDto window = windows.stream().filter(w -> w.getId() == estimate.getAssignedWindowId()).findFirst().orElse(windows.get(0));
        int newCustomerId = customerIdGenerator.incrementAndGet();
        window.getQueue().add(newCustomerId);
        window.setStatus("忙碌");
        window.setEstimatedWaitMinutes(window.getEstimatedWaitMinutes() + 3);
        CustomerDto customer = new CustomerDto(
                newCustomerId,
                currentTimeMinute,
                safeDish(request.getDishType()),
                round(parameters.getAveragePrepMinutes() + random.nextDouble() * 2),
                round(parameters.getAverageEatMinutes() + random.nextDouble() * 8),
                window.getId(),
                currentTimeMinute,
                currentTimeMinute + estimate.getEstimatedWaitMinutes(),
                currentTimeMinute + estimate.getEstimatedWaitMinutes() + 1,
                currentTimeMinute + estimate.getEstimatedWaitMinutes() + 1 + parameters.getAverageEatMinutes(),
                "预约成功"
        );
        recentCustomers.add(0, customer);
        trimRecentCustomers();
        recalculateMetrics();
        return new ReservationResponse(request.getStudentId(), estimate.getAssignedWindowId(), estimate.getEstimatedWaitMinutes(), window.getQueue().size(),
                (int) seats.stream().filter(seat -> seat.getOccupiedBy() == null).count(), "预约已登记，请前往窗口 " + window.getId() + " 取餐。", true);
    }

    @Override
    public synchronized DashboardResponse updateParameters(SimulationParametersDto parameters) {
        this.parameters = parameters;
        rebuildStaticResources();
        recalculateMetrics();
        return buildDashboard();
    }

    @Override
    public synchronized DashboardResponse startSimulation() {
        simulationState = "运行中";
        simulationSpeed = 1.5;
        tick();
        return buildDashboard();
    }

    @Override
    public synchronized DashboardResponse pauseSimulation() {
        simulationState = "已暂停";
        return buildDashboard();
    }

    @Override
    public synchronized DashboardResponse resetSimulation() {
        simulationState = "未开始";
        simulationSpeed = 1.0;
        currentTimeMinute = 0;
        history.clear();
        recentCustomers.clear();
        rebuildStaticResources();
        seedHistory();
        recalculateMetrics();
        return buildDashboard();
    }

    /*
     * 根据仿真参数重置
     * windows chefs 和 seats
    */
    private void rebuildStaticResources() {
        windows.clear();
        chefs.clear();
        seats.clear();
        for (int i = 1; i <= parameters.getWindowCount(); i++) {
            String dish = switch (i % 3) {
                case 1 -> "A套餐";
                case 2 -> "B套餐";
                default -> "C套餐";
            };
            int queueSize = 2 + random.nextInt(4);
            List<Integer> queue = new ArrayList<>();
            for (int q = 0; q < queueSize; q++) {
                queue.add(customerIdGenerator.incrementAndGet());
            }
            windows.add(new WindowDto(i, Math.min(i, parameters.getChefCount()), queue, queueSize > 0 ? "忙碌" : "空闲",
                    round(0.18 + random.nextDouble() * 0.1), dish, 4 + queueSize * 2));
        }
        for (int i = 1; i <= parameters.getChefCount(); i++) {
            String skill = switch (i % 3) {
                case 1 -> "A套餐偏快";
                case 2 -> "B套餐偏快";
                default -> "综合";
            };
            Integer currentOrder = i <= windows.size() && !windows.get(i - 1).getQueue().isEmpty() ? windows.get(i - 1).getQueue().get(0) : null;
            chefs.add(new ChefDto(i, skill, currentOrder, currentOrder == null ? "空闲" : "忙碌", round(0.55 + random.nextDouble() * 0.3)));
        }
        for (int i = 1; i <= parameters.getSeatCount(); i++) {
            Integer occupiedBy = random.nextDouble() > 0.32 ? customerIdGenerator.incrementAndGet() : null;
            String zone = i <= parameters.getSeatCount() / 3 ? "东区" : (i <= parameters.getSeatCount() * 2 / 3 ? "中区" : "西区");
            seats.add(new SeatDto(i, occupiedBy, zone));
        }
    }

    /*
     * 进行模拟
     */
    private void tick() {
        currentTimeMinute = Math.min(parameters.getSimulationDurationMinutes(),
                currentTimeMinute + Math.max(1, (int) Math.round(simulationSpeed * 5)));
        // 处理窗口
        for (WindowDto window : windows) {
            // 45%的概率弹出窗口队列最前面的客户
            // 35%的概率在队列最后面再加一个客户
            if (!window.getQueue().isEmpty() && random.nextDouble() > 0.55) {
                window.getQueue().remove(0);
            } else if (random.nextDouble() > 0.65) {
                window.getQueue().add(customerIdGenerator.incrementAndGet());
            }
            window.setStatus(window.getQueue().isEmpty() ? "空闲" : "忙碌");
            window.setEstimatedWaitMinutes(2 + window.getQueue().size() * 2);
        }
        // 处理厨师
        for (ChefDto chef : chefs) {
            boolean busy = random.nextDouble() > 0.25;
            chef.setStatus(busy ? "忙碌" : "空闲");
            // ????
            chef.setUtilization(round(busy ? (0.70 + random.nextDouble() * 0.25) : 0.20 + random.nextDouble() * 0.2));
            // 设置厨师当前处理的菜品 ？？？？？
            chef.setCurrentOrder(busy ? customerIdGenerator.incrementAndGet() : null);
        }
        // 处理座位
        for (SeatDto seat : seats) {
            if (seat.getOccupiedBy() == null && random.nextDouble() > 0.70) {
                seat.setOccupiedBy(customerIdGenerator.incrementAndGet());
            } else if (seat.getOccupiedBy() != null && random.nextDouble() > 0.82) {
                seat.setOccupiedBy(null);
            }
        }
        recentCustomers.add(0, new CustomerDto(
                customerIdGenerator.incrementAndGet(),
                currentTimeMinute,
                randomDish(),
                round(parameters.getAveragePrepMinutes() + random.nextDouble() * 3),
                round(parameters.getAverageEatMinutes() + random.nextDouble() * 10),
                1 + random.nextInt(parameters.getWindowCount()),
                currentTimeMinute,
                currentTimeMinute + 4 + random.nextInt(8),
                currentTimeMinute + 5 + random.nextInt(8),
                currentTimeMinute + 25 + random.nextInt(20),
                randomStatus()
        ));
        trimRecentCustomers();
        appendHistoryPoint();
        recalculateMetrics();
    }

    private void trimRecentCustomers() {
        while (recentCustomers.size() > 8) {
            recentCustomers.remove(recentCustomers.size() - 1);
        }
    }

    private void seedHistory() {
        for (int i = 0; i < 8; i++) {
            history.add(buildHistoryPoint(i * 15,
                    4.0 + random.nextDouble() * 4,
                    8.0 + random.nextDouble() * 6,
                    0.62 + random.nextDouble() * 0.2,
                    2.0 + random.nextDouble() * 1.4,
                    0.20 + random.nextDouble() * 0.18,
                    0.25 + random.nextDouble() * 0.35));
        }
    }

    private void appendHistoryPoint() {
        history.add(buildHistoryPoint(currentTimeMinute,
                averageQueueLength,
                averageWaitMinutes,
                chefUtilization,
                seatTurnoverRate,
                seatIdleRate,
                congestionRate));
        while (history.size() > 12) {
            history.remove(0);
        }
    }

    /*
     * 生成历史指标趋势
     */
    private Map<String, Object> buildHistoryPoint(int minute, double queueLength, double waitMinutes, double chefUtilization, double seatTurnoverRate,
                                                  double seatIdleRate, double congestionRate) {
        Map<String, Object> point = new HashMap<>();
        point.put("time", minuteToLabel(minute));
        point.put("queueLength", round(queueLength));
        point.put("waitMinutes", round(waitMinutes));
        point.put("chefUtilization", round(chefUtilization));
        point.put("seatTurnoverRate", round(seatTurnoverRate));
        point.put("seatIdleRate", round(seatIdleRate));
        point.put("congestionRate", round(congestionRate));
        return point;
    }

    private String minuteToLabel(int minute) {
        LocalTime base = LocalTime.of(11, 0).plusMinutes(minute);
        return String.format("%02d:%02d", base.getHour(), base.getMinute());
    }

    private void recalculateMetrics() {
        averageQueueLength = round(windows.stream().mapToInt(w -> w.getQueue().size()).average().orElse(0.0));
        averageWaitMinutes = round(windows.stream().mapToInt(WindowDto::getEstimatedWaitMinutes).average().orElse(0.0));
        chefUtilization = round(chefs.stream().mapToDouble(ChefDto::getUtilization).average().orElse(0.0));
        long occupiedSeats = seats.stream().filter(seat -> seat.getOccupiedBy() != null).count();
        seatIdleRate = round(1.0 - occupiedSeats * 1.0 / Math.max(1, seats.size()));
        seatTurnoverRate = round(1.4 + occupiedSeats * 1.0 / Math.max(1, seats.size()) * 2.2);
        congestionRate = round(Math.min(1.0, averageQueueLength / Math.max(1, parameters.getWindowCount() * 3)));
    }

    private DashboardResponse buildDashboard() {
        DashboardResponse response = new DashboardResponse();
        response.setSimulationState(simulationState);
        response.setSimulationSpeed(simulationSpeed);
        response.setCurrentTimeMinute(currentTimeMinute);
        response.setAverageQueueLength(averageQueueLength);
        response.setAverageWaitMinutes(averageWaitMinutes);
        response.setChefUtilization(chefUtilization);
        response.setSeatTurnoverRate(seatTurnoverRate);
        response.setSeatIdleRate(seatIdleRate);
        response.setCongestionRate(congestionRate);
        response.setWindows(copyWindows());
        response.setChefs(copyChefs());
        response.setSeats(copySeats());
        response.setRecentCustomers(copyCustomers());
        response.setHistory(new ArrayList<>(history));
        response.setParameters(parameters);
        return response;
    }

    private List<WindowDto> copyWindows() {
        return windows.stream().map(w -> new WindowDto(w.getId(), w.getChefId(), new ArrayList<>(w.getQueue()), w.getStatus(), w.getServeRate(), w.getDishType(), w.getEstimatedWaitMinutes())).collect(Collectors.toList());
    }

    private List<ChefDto> copyChefs() {
        return chefs.stream().map(c -> new ChefDto(c.getId(), c.getSkill(), c.getCurrentOrder(), c.getStatus(), c.getUtilization())).collect(Collectors.toList());
    }

    private List<SeatDto> copySeats() {
        return seats.stream().map(s -> new SeatDto(s.getId(), s.getOccupiedBy(), s.getZone())).collect(Collectors.toList());
    }

    private List<CustomerDto> copyCustomers() {
        return recentCustomers.stream().map(c -> new CustomerDto(c.getId(), c.getArriveTime(), c.getOrderType(), c.getPrepTime(), c.getEatTime(), c.getWindowId(), c.getQueueStart(), c.getQueueEnd(), c.getEatStart(), c.getLeaveTime(), c.getStatus())).collect(Collectors.toList());
    }

    private String safeDish(String dishType) {
        return dishType == null || dishType.isBlank() ? randomDish() : dishType;
    }

    private String randomDish() {
        String[] dishes = {"A套餐", "B套餐", "C套餐"};
        return dishes[random.nextInt(dishes.length)];
    }

    private String randomStatus() {
        String[] statuses = {"排队中", "取餐完成", "就餐中", "已离场"};
        return statuses[random.nextInt(statuses.length)];
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
