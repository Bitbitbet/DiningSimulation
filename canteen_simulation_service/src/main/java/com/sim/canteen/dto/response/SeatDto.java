package com.sim.canteen.dto.response;

import java.util.List;

/*
 * 一个四座的座位
 **/
public record SeatDto(
        List<Integer> customer
) {
    public static final int SEAT_SIZE = 4;
}
