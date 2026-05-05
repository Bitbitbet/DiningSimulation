package com.sim.canteen.controller;

import com.sim.canteen.dto.request.SimulationParametersDto;
import com.sim.canteen.dto.response.DashboardResponse;
import com.sim.canteen.dto.response.HistoryResponse;
import com.sim.canteen.dto.response.SimulationDataQueryResponse;
import com.sim.canteen.dto.response.StatusResponse;
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

    @GetMapping("/history/recent")
    public ResponseEntity<HistoryResponse> getRecentHistory(@RequestParam int limit,
                                                            @RequestParam int begin) {
        if(begin < 0 || limit <= 0) {
            return ResponseEntity.badRequest().build();
        }
        if(limit > 1000) limit = 1000;
        return ResponseEntity.ok(canteenSimulation.getRecentHistory(limit, begin));
    }

    @GetMapping("/history/range")
    public ResponseEntity<HistoryResponse> getRangeHistory(@RequestParam int begin, @RequestParam int count) {
        if(begin < 0 || count <= 0) {
            return ResponseEntity.badRequest().build();
        }
        if(count > 1000) count = 1000;
        return ResponseEntity.ok(canteenSimulation.getRangeHistory(begin, count));
    }

    @PostMapping("/simulation/pause")
    public void pauseSimulation() {
        canteenSimulation.pauseSimulation();
    }

    @PostMapping("/simulation/resume")
    public ResponseEntity<?> resumeSimulation() {
        if(canteenSimulation.resumeSimulation()) {
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.badRequest().build();
        }
    }
    @PostMapping("/simulation/speed")
    public ResponseEntity<?> setSimulationSpeed(@RequestParam double speed) {
        if(speed <= 0) {
            return ResponseEntity.badRequest().build();
        }
        canteenSimulation.setSimulationSpeed(speed);
        return ResponseEntity.ok().build();
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
