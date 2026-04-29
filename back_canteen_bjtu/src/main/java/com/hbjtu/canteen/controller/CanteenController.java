package com.hbjtu.canteen.controller;

import com.hbjtu.canteen.dto.DashboardResponse;
import com.hbjtu.canteen.dto.SimulationParametersDto;
import com.hbjtu.canteen.dto.StatusResponse;
import com.hbjtu.canteen.service.CanteenSimulation;
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
        return canteenSimulation.getDashboard();
    }

    @PutMapping("/simulation/parameters")
    public DashboardResponse updateParameters(@RequestBody SimulationParametersDto parameters) {
        return canteenSimulation.updateParameters(parameters);
    }

    @PostMapping("/simulation/start")
    public DashboardResponse startSimulation() {
        return canteenSimulation.startSimulation();
    }

    @PostMapping("/simulation/pause")
    public DashboardResponse pauseSimulation() {
        return canteenSimulation.pauseSimulation();
    }

    @PostMapping("/simulation/reset")
    public DashboardResponse resetSimulation() {
        return canteenSimulation.resetSimulation();
    }
}
