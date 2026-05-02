package com.sim.canteen.dto;

import com.sim.canteen.enums.DishType;

import java.util.Map;
import java.util.Optional;

public record ChefDto(int id, Map<DishType, Double> prepTimeModifier,
                      Optional<Integer> orderWindowId,
                      Optional<Double> orderFinishTime) {
}