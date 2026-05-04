package com.sim.canteen.controller;

import com.sim.canteen.dto.request.SimulationParametersDto;
import com.sim.canteen.dto.response.DashboardResponse;
import com.sim.canteen.dto.response.SimulationDataQueryResponse;
import com.sim.canteen.dto.response.StatusResponse;
import com.sim.canteen.enums.ResumeSimulationRst;
import com.sim.canteen.service.CanteenSimulation;
import com.sim.canteen.service.SimulationDataManager;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<DashboardResponse> resumeSimulation() {
        return switch(canteenSimulation.resumeSimulation()) {
            case ResumeSimulationRst.dataNotReady -> ResponseEntity.badRequest().build();
            case ResumeSimulationRst.simulationFinished -> ResponseEntity
                    .badRequest().body(canteenSimulation.getDashboardResponse());
            case ResumeSimulationRst.success -> ResponseEntity.ok(canteenSimulation.getDashboardResponse());
        };
    }

    @PostMapping("/data/new")
    public ResponseEntity<SimulationDataQueryResponse> newSimulationData(
            @RequestBody SimulationParametersDto parameters,
            @RequestParam(value = "name", required = false) Optional<String> name) {
        if(!simulationDataManager.newSimulationData(parameters, name)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(simulationDataManager.querySimulationDataList());
    }

    @GetMapping("/data/query")
    public SimulationDataQueryResponse querySimulationDataList() {
        return simulationDataManager.querySimulationDataList();
    }

    @PostMapping("/data/select/{id}")
    public ResponseEntity<SimulationDataQueryResponse> selectSimulationData(@PathVariable int id) {
        if(!simulationDataManager.selectSimulationData(id)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(simulationDataManager.querySimulationDataList());
    }

    @PostMapping("/data/delete/{id}")
    public ResponseEntity<SimulationDataQueryResponse> deleteSimulationData(@PathVariable int id) {
        if(!simulationDataManager.deleteSimulationData(id)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(simulationDataManager.querySimulationDataList());
    }
}
