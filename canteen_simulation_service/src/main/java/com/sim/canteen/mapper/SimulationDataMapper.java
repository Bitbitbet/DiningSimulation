package com.sim.canteen.mapper;

import com.sim.canteen.entity.SimulationDataPO;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface SimulationDataMapper {
    void insert(SimulationDataPO po);
    int update(SimulationDataPO po);
    SimulationDataPO selectById(@Param("id") int id);
    // 查询所有 simulation 的 id 列表
    List<Integer> selectAllIds();
    // 查询数据库最大的容器 ID
    Integer selectMaxId();
}