package com.sim.canteen.entity;

import com.sim.canteen.dto.response.WindowDto;
import com.sim.canteen.enums.DishType;

import java.util.ArrayList;
import java.util.List;

public class WindowEntity {
    public final DishType dishType;
    public final double windowPrepTimeModifier;
    public final List<Integer> queue;

    public double freeSince;

    public WindowEntity(DishType dishType,
                        double windowPrepTimeModifier,
                        List<Integer> queue,
                        double freeSince) {
        this.dishType = dishType;
        this.windowPrepTimeModifier = windowPrepTimeModifier;
        this.queue = queue;
        this.freeSince = freeSince;
    }

    public WindowDto dto() {
        return new WindowDto(
                dishType,
                queue
        );
    }
    public WindowEntity() {
        this.dishType = null;
        this.windowPrepTimeModifier = 0;
        this.queue = new ArrayList<>(); // ❗ 绝对不能是 null
        this.freeSince = 0;
    }

}