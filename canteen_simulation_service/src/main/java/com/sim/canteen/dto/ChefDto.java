package com.sim.canteen.dto;

import com.sim.canteen.enums.ChefSkillType;

public record ChefDto(int id, ChefSkillType skill, Integer currentOrder, boolean busy, double utilization) {
}