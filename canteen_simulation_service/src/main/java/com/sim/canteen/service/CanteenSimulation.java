package com.sim.canteen.service;

import com.sim.canteen.dto.response.DashboardResponse;
import com.sim.canteen.dto.response.HistoryResponse;
import com.sim.canteen.dto.response.StatusResponse;
import com.sim.canteen.enums.ResumeSimulationRst;
import com.sim.canteen.simulation.SimulationData;
import org.springframework.stereotype.Service;

@Service
public interface CanteenSimulation {
    public void pauseSimulation();

    public ResumeSimulationRst resumeSimulation();

    public void shutdown();

    public void setSimulationData(SimulationData simulationData);

    /**
     * 获取最近的历史信息
     * @param limit 限制至多的项数，只能为1到1000
     * @param begin 限制只在该下标之后的历史项，大于等于0
     */
    public HistoryResponse getRecentHistory(int limit, int begin);

    public HistoryResponse getRangeHistory(int begin, int count);

    StatusResponse getStatus();

    public DashboardResponse getDashboardResponse();
}
