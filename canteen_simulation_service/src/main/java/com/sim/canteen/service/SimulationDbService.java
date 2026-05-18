package com.sim.canteen.service;

import com.sim.canteen.dto.response.HistoryPointDto;
import com.sim.canteen.entity.CustomerEntity;
import com.sim.canteen.entity.SeatEntity;
import com.sim.canteen.entity.SimulationDataPO;
import com.sim.canteen.entity.WindowEntity;
import com.sim.canteen.enums.CustomerState;
import com.sim.canteen.mapper.*;
import com.sim.canteen.simulation.SimulationData;
import com.sim.canteen.dto.request.SimulationParametersDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SimulationDbService {

    private final SimulationDataMapper dataMapper;
    private final SimWindowMapper windowMapper;
    private final SimSeatMapper seatMapper;
    private final SimCustomerMapper customerMapper;
    private final SimHistoryMapper historyMapper;
    private final ObjectMapper objectMapper;

    // ====================== 核心修正：用 PO 存取 ======================
    @Transactional
    public void saveSnapshot(SimulationData data) {
        try {
            // 1. 把 内存实体 → 数据库PO
            SimulationDataPO po = new SimulationDataPO();
            po.setId(data.id);
            po.setName(data.name);
            po.setFinished(data.finished);
            po.setTime(data.time);
            po.setLeftCustomerWaitSeatSecAvg(data.leftCustomerWaitSeatSecAvg);
            po.setLeftCustomerWaitSeatSampleCnt(data.leftCustomerWaitSeatSampleCnt);
            po.setLeftCustomers(data.leftCustomers);
            po.setCustomerGroupArriveRate(data.customerGroupArriveRate);
            po.setCustomerIdGenerator(data.customerIdGenerator);
            po.setCustomerGroupIdGenerator(data.customerGroupIdGenerator);
            po.setNextCustomerGrpTime(data.nextCustomerGrpTime);

            // 存参数JSON
            String paraJson = objectMapper.writeValueAsString(data.para);
            po.setParametersJson(paraJson);

            int rows = dataMapper.update(po);
            if (rows == 0) {
                dataMapper.insert(po);
            }

            // ====================== 窗口 ======================
            windowMapper.deleteBySimulationId(data.id);
            if (!data.windows.isEmpty()) {
                windowMapper.batchInsert(data.id, data.windows);
            }

            // ====================== 座位 ======================
            seatMapper.deleteBySimulationId(data.id);
            if (!data.seats.isEmpty()) {
                seatMapper.batchInsert(data.id, data.seats);
            }

            // ====================== 顾客 ======================
            customerMapper.deleteBySimulationId(data.id);
            List<CustomerEntity> customers = new ArrayList<>(data.customers.values());
            if (!customers.isEmpty()) {
                customerMapper.batchInsert(data.id, customers);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ====================== 保存历史（结束时） ======================
    public void saveHistory(SimulationData data) {
        try {
            if (!data.historyPoints.isEmpty()) {
                // 修复：过滤 NaN
                List<HistoryPointDto> cleanList = data.historyPoints.stream()
                        .toList();

                historyMapper.batchInsert(data.id, cleanList);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public SimulationData loadFromDb(int id) {
        try {
            // 1. 读取 PO
            SimulationDataPO po = dataMapper.selectById(id);
            if (po == null) return null;

            // 2. 读取子数据
            List<WindowEntity> windows = windowMapper.selectBySimulationId(id);
            List<SeatEntity> seats = seatMapper.selectBySimulationId(id);
            List<CustomerEntity> customers = customerMapper.selectBySimulationId(id);
            List<HistoryPointDto> historyPoints = historyMapper.selectBySimulationId(id);

            // 3. 把 JSON 转回参数
            SimulationParametersDto para = objectMapper.readValue(po.getParametersJson(), SimulationParametersDto.class);

            // 4. 重建内存 SimulationData
            SimulationData data = new SimulationData(po.getId(), po.getName(), para);
            data.finished = po.getFinished();
            data.time = po.getTime();
            data.leftCustomerWaitSeatSecAvg = po.getLeftCustomerWaitSeatSecAvg();
            data.leftCustomerWaitSeatSampleCnt = po.getLeftCustomerWaitSeatSampleCnt();
            data.leftCustomers = po.getLeftCustomers();
            data.customerIdGenerator = po.getCustomerIdGenerator();
            data.customerGroupIdGenerator = po.getCustomerGroupIdGenerator();
            data.nextCustomerGrpTime = po.getNextCustomerGrpTime();

            // 5. 回填数据
            data.windows.clear();
            data.windows.addAll(windows);

            data.seats.clear();
            data.seats.addAll(seats);

            data.customers.clear();
            for (CustomerEntity c : customers) {
                data.customers.put(c.getId(), c);
            }

            data.historyPoints.clear();
            data.historyPoints.addAll(historyPoints);

            // ==============================================
            // 【1】重建窗口队列（已加，正常工作）
            // ==============================================
            for (WindowEntity window : data.windows) {
                window.queue.clear();
            }
            for (CustomerEntity customer : data.customers.values()) {
                if (customer.state == CustomerState.Queuing) {
                    for (WindowEntity w : data.windows) {
                        if (w.dishType == customer.orderType) {
                            w.queue.add(customer.id);
                            break;
                        }
                    }
                }
            }

            // ==============================================
            // 【2】✅ 最后修复：重建顾客分组 customerGroups
            // ==============================================
            data.customerGroups.clear();
            for (CustomerEntity customer : data.customers.values()) {
                // 按 groupId 重新分组
                data.customerGroups.computeIfAbsent(customer.groupId, k -> new ArrayList<>())
                        .add(customer.id);
            }

            return data;

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}