/*
 * 顾客的生命周期：
 * 1. Queuing，由arriveTime开始，到排在队列第一个的时候结束
 * 2. WaitingForDish, 排在队列第一个的时候开始，dishPrepEndTime的时候结束
 * 3. WaitingForGroup, dishPrepEndTime的时候开始，
 *           其他组员都进入WaitingForGroup的状态时结束（startWaitingForSeatTime）
 * 4. WaitingForSeat, 所有组员都进入WaitingForGroup的时候开始（startWaitingForSeatTime），
 *           有空闲的位子时结束
 * 5. Eating，到eatEndTime的时候结束。
 * */

package com.sim.canteen.entity;

import com.sim.canteen.dto.response.CustomerDto;
import com.sim.canteen.enums.CustomerState;
import com.sim.canteen.enums.DishType;


public class CustomerEntity {
    public final int id;
    public final int groupId;
    public final int groupSize;

    public final double simulatedDishPrepSeconds;
    public final double simulatedEatTimeSeconds;
    public final double arriveTime;
    public final DishType orderType;

    public CustomerState state;

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

        this.state = CustomerState.Queuing;
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
                state
        );
    }
}