package com.hbjtu.canteen.dto;

import com.hbjtu.canteen.enums.ChefSkillType;

public record ChefDto(int id, ChefSkillType skill, Integer currentOrder, boolean busy, double utilization) {
}