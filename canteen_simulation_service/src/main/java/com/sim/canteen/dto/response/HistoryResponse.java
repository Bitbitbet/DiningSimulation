package com.sim.canteen.dto.response;

import java.util.List;

public record HistoryResponse(
        List<HistoryPointDto> data,
        int begin,
        int count,
        boolean endingHasMore
) {
}
