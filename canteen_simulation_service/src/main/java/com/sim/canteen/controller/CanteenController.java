package com.sim.canteen.controller;

import com.sim.canteen.dto.request.SimulationParametersDto;
import com.sim.canteen.dto.response.DashboardResponse;
import com.sim.canteen.dto.response.SimulationDataQueryResponse;
import com.sim.canteen.dto.response.StatusResponse;
import com.sim.canteen.service.CanteenSimulation;
import com.sim.canteen.service.SimulationDataManager;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api")
public class CanteenController {
    private final CanteenSimulation canteenSimulation;
    private final SimulationDataManager simulationDataManager;

    public CanteenController(
            CanteenSimulation canteenSimulation,
            SimulationDataManager simulationDataManager
    ) {
        this.canteenSimulation = canteenSimulation;
        this.simulationDataManager = simulationDataManager;
    }

    @GetMapping("/status")
    public StatusResponse getStatus() {
        return canteenSimulation.getStatus();
    }

    @GetMapping("/dashboard")
    public DashboardResponse getDashboard() {
        return canteenSimulation.getDashboardResponse();
    }

    @PostMapping("/simulation/pause")
    public DashboardResponse pauseSimulation() {
        canteenSimulation.pauseSimulation();
        return canteenSimulation.getDashboardResponse();
    }

    @PostMapping("/simulation/resume")
    public DashboardResponse resumeSimulation() {
        canteenSimulation.pauseSimulation();
        return canteenSimulation.getDashboardResponse();
    }

    @PostMapping("/data/new")
    public SimulationDataQueryResponse newSimulationData(
            @RequestBody SimulationParametersDto parameters,
            Optional<String> name) {
        simulationDataManager.newSimulationData(parameters, name);
        return simulationDataManager.querySimulationDataList();
    }

    @GetMapping("/data/query")
    public SimulationDataQueryResponse querySimulationDataList() {
        return simulationDataManager.querySimulationDataList();
    }

    @PostMapping("/data/select")
    public SimulationDataQueryResponse selectSimulationData(int id) {
        simulationDataManager.selectSimulationData(id);
        return simulationDataManager.querySimulationDataList();
    }
}
