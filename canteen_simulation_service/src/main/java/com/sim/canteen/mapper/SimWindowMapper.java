package com.sim.canteen.mapper;

import com.sim.canteen.entity.WindowEntity;
import org.apache.ibatis.annotations.Param;
import java.util.List;

public interface SimWindowMapper {
    void deleteBySimulationId(@Param("simId") int simId);
    void batchInsert(@Param("simId") int simId, @Param("list") List<WindowEntity> list);
    List<WindowEntity> selectBySimulationId(@Param("simId") int simId);
}