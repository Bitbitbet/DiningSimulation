package com.sim.canteen.service.impl;

import com.sim.canteen.dto.SimulationParametersDto;
import com.sim.canteen.service.CanteenSimulation;
import com.sim.canteen.service.SimulationDataManager;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@Service
public class SimulationDataManagerImpl implements SimulationDataManager {
    private final HashMap<Integer, SimulationData> datas = new HashMap<>();
    private final CanteenSimulation canteenSimulation;
    private SimulationData selectedSimulationData = null;

    public SimulationDataManagerImpl(
            CanteenSimulation canteenSimulation
    ) {
        this.canteenSimulation = canteenSimulation;
    }

    public void newSimulationData(SimulationParametersDto parameters) {}

    public void deleteSimulationData() {}

    public void selectSimulationData() {}

}

