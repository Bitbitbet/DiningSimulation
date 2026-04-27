package com.hbjtu.canteen.dto;

public class SeatDto {
    private int id;
    private Integer occupiedBy;

    public SeatDto() {
    }

    public SeatDto(int id, Integer occupiedBy) {
        this.id = id;
        this.occupiedBy = occupiedBy;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public Integer getOccupiedBy() { return occupiedBy; }
    public void setOccupiedBy(Integer occupiedBy) { this.occupiedBy = occupiedBy; }
}
