package com.hbjtu.canteen.controller;

import com.hbjtu.canteen.dto.DashboardResponse;
import com.hbjtu.canteen.dto.SimulationParametersDto;
import com.hbjtu.canteen.dto.StatusResponse;
import com.hbjtu.canteen.service.CanteenService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CanteenController {
    private final CanteenService canteenService;

    public CanteenController(CanteenService canteenService) {
        this.canteenService = canteenService;
    }

    @GetMapping("/status")
    public StatusResponse getStatus() {
        return canteenService.getStatus();
    }

    @GetMapping("/dashboard")
    public DashboardResponse getDashboard() {
        return canteenService.getDashboard();
    }

    @PutMapping("/simulation/parameters")
    public DashboardResponse updateParameters(@RequestBody SimulationParametersDto parameters) {
        return canteenService.updateParameters(parameters);
    }

    @PostMapping("/simulation/start")
    public DashboardResponse startSimulation() {
        return canteenService.startSimulation();
    }

    @PostMapping("/simulation/pause")
    public DashboardResponse pauseSimulation() {
        return canteenService.pauseSimulation();
    }

    @PostMapping("/simulation/reset")
    public DashboardResponse resetSimulation() {
        return canteenService.resetSimulation();
    }
}
