package com.sim.canteen.controller;

import com.sim.canteen.dto.DashboardResponse;
import com.sim.canteen.dto.SimulationParametersDto;
import com.sim.canteen.dto.StatusResponse;
import com.sim.canteen.service.CanteenSimulation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CanteenController {
    private final CanteenSimulation canteenSimulation;

    public CanteenController(CanteenSimulation canteenSimulation) {
        this.canteenSimulation = canteenSimulation;
    }

    @GetMapping("/status")
    public StatusResponse getStatus() {
        return canteenSimulation.getStatus();
    }

    @GetMapping("/dashboard")
    public DashboardResponse getDashboard() {
        // TODO
    }

    @PutMapping("/simulation/parameters")
    public DashboardResponse updateParameters(@RequestBody SimulationParametersDto parameters) {
        // TODO
    }

    @PostMapping("/simulation/start")
    public DashboardResponse startSimulation() {
        // TODO
    }

    @PostMapping("/simulation/pause")
    public DashboardResponse pauseSimulation() {
        // TODO
    }

    @PostMapping("/simulation/reset")
    public DashboardResponse resetSimulation() {
        //TODO
    }
}
