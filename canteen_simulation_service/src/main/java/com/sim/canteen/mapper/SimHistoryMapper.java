package com.sim.canteen.mapper;

import com.sim.canteen.dto.response.HistoryPointDto;
import org.apache.ibatis.annotations.Param;
import java.util.List;

public interface    SimHistoryMapper {
    void batchInsert(@Param("simId") int simId, @Param("list") List<HistoryPointDto> list);
    List<HistoryPointDto> selectBySimulationId(@Param("simId") int simId);
}