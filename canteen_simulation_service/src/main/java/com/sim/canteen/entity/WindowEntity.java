package com.sim.canteen.entity;

import com.sim.canteen.dto.WindowDto;
import com.sim.canteen.enums.DishType;

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
                windowPrepTimeModifier,
                queue
        );
    }
}