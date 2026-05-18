package com.sim.canteen.service.impl;

import com.sim.canteen.dto.request.SimulationParametersDto;
import com.sim.canteen.dto.response.SimulationDataDto;
import com.sim.canteen.dto.response.SimulationDataQueryResponse;
import com.sim.canteen.enums.DishType;
import com.sim.canteen.mapper.SimulationDataMapper;
import com.sim.canteen.service.CanteenSimulation;
import com.sim.canteen.service.SimulationDataManager;
import com.sim.canteen.service.SimulationDbService;
import com.sim.canteen.simulation.SimulationData;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Optional;

@Service
public class SimulationDataManagerImpl implements SimulationDataManager {
    private final CanteenSimulation canteenSimulation;

    private final HashMap<Integer, SimulationData> datas = new HashMap<>();
    private SimulationData selectedSimulationData = null;

    private int simulatedDataIdGenerator;

    @Autowired
    private SimulationDbService simulationDbService;
    @Autowired
    private SimulationDataMapper simulationDataMapper;

    @PostConstruct
    public void initOnStartup() {
        // 1. 初始化 ID 自增（从数据库最大 ID +1 开始）
        Integer maxId = simulationDataMapper.selectMaxId();
        this.simulatedDataIdGenerator = (maxId == null) ? 0 : maxId + 1;

        // 2. 🔥 加载所有模拟到内存
        List<Integer> allIds = simulationDataMapper.selectAllIds();
        for (Integer id : allIds) {
            SimulationData data = simulationDbService.loadFromDb(id);
            if (data != null) {
                datas.put(id, data);
            }
        }

        System.out.println("✅ 项目启动成功，共加载 " + datas.size() + " 个模拟容器到内存");
    }



    public SimulationDataManagerImpl(
            CanteenSimulation canteenSimulation
    ) {
        this.canteenSimulation = canteenSimulation;

    }

    @Override
    public boolean newSimulationData(SimulationParametersDto parameters, Optional<String> name) {
        if(!validateSimulationParameters(parameters)) {
            return false;
        }
        var id = simulatedDataIdGenerator++;
        var data = new SimulationData(
                id,
                name.orElse("Simulation #" + id),
                parameters
        );
        datas.put(id, data);
        simulationDbService.saveSnapshot(data);

        return true;
    }

    private boolean validateSimulationParameters(SimulationParametersDto parameters) {
        if(parameters.simulationTotalMinutes() <= 0) {
            return false;
        }
        if(parameters.customerArriveRate() <= 0) {
            return false;
        }

        if(parameters.customerGroupSizeRatio().size() != 4) {
            return false;
        }
        if(!parameters.customerGroupSizeRatio().containsKey(1)) {
            return false;
        }
        if(!parameters.customerGroupSizeRatio().containsKey(2)) {
            return false;
        }
        if(!parameters.customerGroupSizeRatio().containsKey(3)) {
            return false;
        }
        if(!parameters.customerGroupSizeRatio().containsKey(4)) {
            return false;
        }

        if(parameters.customerDishRatio().size() != 3) {
            return false;
        }
        if(!parameters.customerDishRatio().containsKey(DishType.A)) {
            return false;
        }
        if(!parameters.customerDishRatio().containsKey(DishType.B)) {
            return false;
        }
        if(!parameters.customerDishRatio().containsKey(DishType.C)) {
            return false;
        }
        if(parameters.customerEatSecondsAvg() <= 0) {
            return false;
        }
        if(parameters.customerEatSecondsStdVar() <= 0) {
            return false;
        }
        if(parameters.dishPrepSecondsAvg() <= 0) {
            return false;
        }
        if(parameters.dishPrepSecondsStdVar() <= 0) {
            return false;
        }
        if(!parameters.windows()
                .stream()
                .allMatch(windowPa -> windowPa.windowPrepTimeModifier() > 0)) {
            return false;
        }
        if(parameters.windows()
                .stream()
                .noneMatch(windowPa -> windowPa.dishType().equals(DishType.A))) {
            return false;
        }
        if(parameters.windows()
                .stream()
                .noneMatch(windowPa -> windowPa.dishType().equals(DishType.B))) {
            return false;
        }
        if(parameters.windows()
                .stream()
                .noneMatch(windowPa -> windowPa.dishType().equals(DishType.C))) {
            return false;
        }
        if(parameters.seatCount() <= 0) {
            return false;
        }

        return true;
    }

    @Override
    public boolean deleteSimulationData(int id) {
        if(!datas.containsKey(id))
            return false;
        if(selectedSimulationData == datas.get(id)) {
            selectedSimulationData = null;
        }
        canteenSimulation.setSimulationData(null);
        datas.remove(id);
        return true;
    }

//    @Override
//    public SimulationDataQueryResponse querySimulationDataList() {
//        HashMap<Integer, SimulationDataDto> dataList = new HashMap<>();
//        Integer selected = null;
//        for(var entry : datas.entrySet()) {
//            dataList.put(entry.getKey(), entry.getValue().dto());
//            if(entry.getValue() == selectedSimulationData) {
//                selected = entry.getKey();
//            }
//        }
//        return new SimulationDataQueryResponse(
//            dataList,
//            selected
//        );
//    }
@Override
public SimulationDataQueryResponse querySimulationDataList() {
    HashMap<Integer, SimulationDataDto> dataList = new HashMap<>();
    Integer selected = null;

    // 1. 从数据库查询【所有容器ID】 ← 你要的核心改动
    List<Integer> allIds = simulationDataMapper.selectAllIds();

    // 2. 遍历每个ID，调用 loadFromDb 加载数据
    for (Integer id : allIds) {
        // 从数据库加载完整 SimulationData
        SimulationData data = simulationDbService.loadFromDb(id);
        if (data == null) {
            continue; // 跳过无效数据
        }

        // 3. 转 DTO，放入 map
        dataList.put(id, data.dto());

        // 4. 原来的逻辑：判断是否是当前选中的容器
        if (selectedSimulationData != null && data.id == selectedSimulationData.id) {
            selected = id;
        }
    }

    // 5. 返回格式和原来完全一样
    return new SimulationDataQueryResponse(
            dataList,
            selected
    );
}

    @Override
    public boolean selectSimulationData(int id) {
        if(!datas.containsKey(id))
            return false;
        var data = datas.get(id);

        selectedSimulationData = data;
        canteenSimulation.setSimulationData(data);

        return true;
    }
//@Override
//public boolean selectSimulationData(int id) {
//    // 1. 先从内存拿
//    SimulationData data = datas.get(id);
//
//    // 2. 内存没有 → 从数据库加载！！！
//    if (data == null) {
//        data = simulationDbService.loadFromDb(id);
//        if (data == null) {
//            return false; // 数据库也没有，返回失败
//        }
//        // 加载成功 → 放入内存
//        datas.put(id, data);
//    }
//
//    // 3. 选中 & 设置给模拟引擎
//    selectedSimulationData = data;
//    canteenSimulation.setSimulationData(data);
//
//    return true;
//}

    @Override
    public void addLoadedSimulationData(SimulationData data) {
        datas.put(data.id, data);
    }


}

