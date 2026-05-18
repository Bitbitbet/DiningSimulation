package com.sim.canteen.service;

import com.sim.canteen.dto.request.SimulationParametersDto;
import com.sim.canteen.dto.response.HistoryResponse;
import com.sim.canteen.dto.response.SimulationDataQueryResponse;
import com.sim.canteen.simulation.SimulationData;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public interface SimulationDataManager {
    public boolean newSimulationData(SimulationParametersDto parameters, Optional<String> name);

    public boolean deleteSimulationData(int id);

    public SimulationDataQueryResponse querySimulationDataList();

    public boolean selectSimulationData(int id);

    /**
     * 获取最近的历史信息
     * @param limit 限制至多的项数，必须大于等于1
     * @param begin 限制只在该下标之后的历史项，大于等于0
     */
    public HistoryResponse getRecentHistory(int id, int limit, int begin);

    public HistoryResponse getRangeHistory(int id, int begin, int count);

    public void addLoadedSimulationData(SimulationData data);
}
