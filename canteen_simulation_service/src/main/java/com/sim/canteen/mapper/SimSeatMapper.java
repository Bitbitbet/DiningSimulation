package com.sim.canteen.mapper;

import com.sim.canteen.entity.SeatEntity;
import org.apache.ibatis.annotations.Param;
import java.util.List;

public interface SimSeatMapper {
    void deleteBySimulationId(@Param("simId") int simId);
    void batchInsert(@Param("simId") int simId, @Param("list") List<SeatEntity> list);
    List<SeatEntity> selectBySimulationId(@Param("simId") int simId);
}