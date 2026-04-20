package com.hbjtu.canteen.dto;

public class ReservationResponse {
    private String studentId;
    private int assignedWindowId;
    private int estimatedWaitMinutes;
    private int queuePosition;
    private int availableSeatCount;
    private String suggestion;
    private boolean confirmed;

    public ReservationResponse() {
    }

    public ReservationResponse(String studentId, int assignedWindowId, int estimatedWaitMinutes, int queuePosition, int availableSeatCount, String suggestion, boolean confirmed) {
        this.studentId = studentId;
        this.assignedWindowId = assignedWindowId;
        this.estimatedWaitMinutes = estimatedWaitMinutes;
        this.queuePosition = queuePosition;
        this.availableSeatCount = availableSeatCount;
        this.suggestion = suggestion;
        this.confirmed = confirmed;
    }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public int getAssignedWindowId() { return assignedWindowId; }
    public void setAssignedWindowId(int assignedWindowId) { this.assignedWindowId = assignedWindowId; }
    public int getEstimatedWaitMinutes() { return estimatedWaitMinutes; }
    public void setEstimatedWaitMinutes(int estimatedWaitMinutes) { this.estimatedWaitMinutes = estimatedWaitMinutes; }
    public int getQueuePosition() { return queuePosition; }
    public void setQueuePosition(int queuePosition) { this.queuePosition = queuePosition; }
    public int getAvailableSeatCount() { return availableSeatCount; }
    public void setAvailableSeatCount(int availableSeatCount) { this.availableSeatCount = availableSeatCount; }
    public String getSuggestion() { return suggestion; }
    public void setSuggestion(String suggestion) { this.suggestion = suggestion; }
    public boolean isConfirmed() { return confirmed; }
    public void setConfirmed(boolean confirmed) { this.confirmed = confirmed; }
}
