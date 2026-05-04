package com.sim.canteen.service;

import com.sim.canteen.dto.request.SimulationParametersDto;
import com.sim.canteen.dto.response.SimulationDataDto;
import com.sim.canteen.dto.response.SimulationDataQueryResponse;
import com.sim.canteen.simulation.SimulationData;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Optional;

@Service
public interface SimulationDataManager {
    public void newSimulationData(SimulationParametersDto parameters, Optional<String> name);

    public boolean deleteSimulationData(int id);

    public SimulationDataQueryResponse querySimulationDataList();

    public boolean selectSimulationData(int id);
}
