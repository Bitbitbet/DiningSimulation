package com.hbjtu.canteen.dto;

public class ReservationRequest {
    private String studentId;
    private int partySize;
    private String mealType;
    private String dishType;

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public int getPartySize() { return partySize; }
    public void setPartySize(int partySize) { this.partySize = partySize; }
    public String getMealType() { return mealType; }
    public void setMealType(String mealType) { this.mealType = mealType; }
    public String getDishType() { return dishType; }
    public void setDishType(String dishType) { this.dishType = dishType; }
}
