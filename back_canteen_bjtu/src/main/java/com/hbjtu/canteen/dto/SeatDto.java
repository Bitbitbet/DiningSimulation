package com.hbjtu.canteen.dto;

public class SeatDto {
    private int id;
    private Integer occupiedBy;
    private String zone;

    public SeatDto() {
    }

    public SeatDto(int id, Integer occupiedBy, String zone) {
        this.id = id;
        this.occupiedBy = occupiedBy;
        this.zone = zone;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public Integer getOccupiedBy() { return occupiedBy; }
    public void setOccupiedBy(Integer occupiedBy) { this.occupiedBy = occupiedBy; }
    public String getZone() { return zone; }
    public void setZone(String zone) { this.zone = zone; }
}
