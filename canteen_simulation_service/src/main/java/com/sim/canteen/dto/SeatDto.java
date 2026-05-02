package com.sim.canteen.dto;

import java.util.Optional;

public record SeatDto (
    int id,
    Optional<Integer> customer
) {}
