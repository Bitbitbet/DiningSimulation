package com.sim.canteen.dto;

import java.util.Optional;

public record ChefDto(int id, Optional<Integer> orderWindowId) {
}