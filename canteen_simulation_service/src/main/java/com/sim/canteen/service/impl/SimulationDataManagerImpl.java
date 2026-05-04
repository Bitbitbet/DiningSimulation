package com.sim.canteen.service.impl;

import com.sim.canteen.dto.request.SimulationParametersDto;
import com.sim.canteen.dto.response.SimulationDataDto;
import com.sim.canteen.dto.response.SimulationDataQueryResponse;
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
    public void newSimulationData(SimulationParametersDto parameters, Optional<String> name) {
        var id = simulatedDataIdGenerator++;
        var data = new SimulationData(
                id,
                name.orElse("Simulation #" + id),
                parameters
        );
        data.id = id;
        data.para = parameters;
        datas.put(id, data);
    }

    @Override
    public boolean deleteSimulationData(int id) {
        if(!datas.containsKey(id))
            return false;
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

