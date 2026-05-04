package com.sim.canteen;


import com.sim.canteen.dto.request.SimulationParametersDto;
import com.sim.canteen.dto.request.WindowParametersDto;
import com.sim.canteen.dto.response.DashboardResponse;
import com.sim.canteen.dto.response.SimulationDataDto;
import com.sim.canteen.dto.response.SimulationDataQueryResponse;
import com.sim.canteen.dto.response.StatusResponse;
import com.sim.canteen.enums.DishType;
import com.sim.canteen.enums.SimulationState;
import com.sim.canteen.service.impl.CanteenSimulationImpl;
import com.sim.canteen.service.impl.SimulationDataManagerImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@ExtendWith(MockitoExtension.class)
public class SimulationTest {
    @InjectMocks
    private CanteenSimulationImpl canteenSimulation;
    @InjectMocks
    private SimulationDataManagerImpl simulationDataManager;

    @Test
    public void statusResponseTest() {
        assertThat(canteenSimulation.getStatus()).isEqualTo(new StatusResponse(true));
    }

    @Test
    public void directlyRunDashboardResponseTest() {
        assertThat(canteenSimulation.getDashboardResponse())
                .isEqualTo(new DashboardResponse(
                        SimulationState.pending,
                        List.of(), List.of(), List.of()
                ));
    }

    @Test
    public void simulationDataTest() {
        assertThat(simulationDataManager.querySimulationDataList())
                .isEqualTo(new SimulationDataQueryResponse(
                        new HashMap<>(),
                        null
                ));
        assertThat(simulationDataManager.newSimulationData(
                new SimulationParametersDto(
                        60,
                        0.8,
                        Map.of(1, 10, 2, 2, 3, 1, 4, 4),
                        Map.of(DishType.A, 5, DishType.B, 3, DishType.C, 4),
                        60,
                        10,
                        60,
                        10,
                        List.of(
                                new WindowParametersDto(DishType.A, 1.0),
                                new WindowParametersDto(DishType.B, 1.0),
                                new WindowParametersDto(DishType.C, 1.0),
                                new WindowParametersDto(DishType.A, 1.0)
                        ),
                        30
                ), Optional.of("TestData")
        )).isEqualTo(true);
        var expected = new HashMap<Integer, SimulationDataDto>();
        expected.put(0, new SimulationDataDto(0, "TestData"));
        assertThat(simulationDataManager.querySimulationDataList())
                .isEqualTo(new SimulationDataQueryResponse(
                        expected,
                        null
                ));
    }
}
