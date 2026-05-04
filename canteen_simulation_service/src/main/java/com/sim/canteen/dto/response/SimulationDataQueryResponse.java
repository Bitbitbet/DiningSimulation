package com.sim.canteen.dto.response;

import java.util.HashMap;
import java.util.List;

public record SimulationDataQueryResponse(
    HashMap<Integer, SimulationDataDto> simulationDataList,
    Integer selected
) {
}
