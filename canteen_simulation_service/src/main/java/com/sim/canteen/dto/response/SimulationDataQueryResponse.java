package com.sim.canteen.dto.response;

import java.util.HashMap;

public record SimulationDataQueryResponse(
    HashMap<Integer, SimulationDataDto> simulationDataList,
    Integer selected
) {
}
