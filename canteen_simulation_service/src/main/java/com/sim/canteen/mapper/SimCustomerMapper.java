    package com.sim.canteen.mapper;

import com.sim.canteen.entity.CustomerEntity;
import org.apache.ibatis.annotations.Param;
import java.util.List;

public interface SimCustomerMapper {
    void deleteBySimulationId(@Param("simId") int simId);
    void batchInsert(@Param("simId") int simId, @Param("list") List<CustomerEntity> list);
    List<CustomerEntity> selectBySimulationId(@Param("simId") int simId);

    void deleteBySimId(int id);
}