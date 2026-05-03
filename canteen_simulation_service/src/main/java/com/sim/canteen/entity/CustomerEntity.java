package com.sim.canteen.entity;

import com.sim.canteen.dto.CustomerDto;
import com.sim.canteen.enums.CustomerStatus;
import com.sim.canteen.enums.DishType;

public class CustomerEntity {
    public final int id;
    public final int groupId;
    public final int groupSize;

    public final double simulatedDishPrepSeconds;
    public final double simulatedEatTimeSeconds;
    public final double arriveTime;
    public final DishType orderType;

    public CustomerStatus status;

    /**
     * 当status == CustomerStatus.WaitingForDish
     * 的时候设置
     */
    public double dishPrepEndTime;

    /**
     * 当status == CustomerStatus.WaitingForSeat
     * 的时候设置
     */
    public double startWaitingForSeatTime;

    /**
     * 当status == CustomerStatus.Eating
     * 的时候设置
     */
    public double eatEndTime;
    /**
     * 当status == CustomerStatus.Eating
     * 的时候设置
     */
    public int seatId;

    public CustomerEntity(int id,
                          int groupId,
                          int groupSize,
                          double simulatedDishPrepSeconds,
                          double simulatedEatTimeSeconds,
                          double arriveTime,
                          DishType orderType) {
        this.id = id;
        this.groupId = groupId;
        this.groupSize = groupSize;
        this.simulatedDishPrepSeconds = simulatedDishPrepSeconds;
        this.simulatedEatTimeSeconds = simulatedEatTimeSeconds;
        this.arriveTime = arriveTime;
        this.orderType = orderType;

        this.status = CustomerStatus.Queuing;
    }

    public CustomerDto dto() {
        return new CustomerDto(
                id,
                groupId,
                groupSize,
                simulatedDishPrepSeconds,
                simulatedEatTimeSeconds,
                arriveTime,
                orderType,
                status
        );
    }
}