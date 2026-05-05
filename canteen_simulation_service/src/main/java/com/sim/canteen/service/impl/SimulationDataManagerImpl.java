package com.sim.canteen.service.impl;

import com.sim.canteen.dto.request.SimulationParametersDto;
import com.sim.canteen.dto.response.SimulationDataDto;
import com.sim.canteen.dto.response.SimulationDataQueryResponse;
import com.sim.canteen.enums.DishType;
import com.sim.canteen.service.CanteenSimulation;
import com.sim.canteen.service.SimulationDataManager;
import com.sim.canteen.simulation.SimulationData;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Optional;

@Service
public class SimulationDataManagerImpl implements SimulationDataManager {
    private final CanteenSimulation canteenSimulation;

    private final HashMap<Integer, SimulationData> datas = new HashMap<>();
    private SimulationData selectedSimulationData = null;

    private int simulatedDataIdGenerator = 0;

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

    @Override
    public SimulationDataQueryResponse querySimulationDataList() {
        HashMap<Integer, SimulationDataDto> dataList = new HashMap<>();
        Integer selected = null;
        for(var entry : datas.entrySet()) {
            dataList.put(entry.getKey(), entry.getValue().dto());
            if(entry.getValue() == selectedSimulationData) {
                selected = entry.getKey();
            }
        }
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
}

