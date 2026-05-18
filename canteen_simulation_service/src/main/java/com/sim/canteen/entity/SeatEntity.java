package com.sim.canteen.entity;


import com.sim.canteen.dto.response.SeatDto;

import java.util.ArrayList;
import java.util.List;

public class    SeatEntity {
    public final int id;
    public List<Integer> customers;
    public double fourFreeSince;
    public double threeFreeSince;
    public double twoFreeSince;
    public double oneFreeSince;

    public SeatEntity(
            int id,
            List<Integer> customer,
            double fourFreeSince,
            double threeFreeSince,
            double twoFreeSince,
            double oneFreeSince
    ) {
        this.id = id;
        this.customers = customer;
        this.fourFreeSince = fourFreeSince;
        this.threeFreeSince = threeFreeSince;
        this.twoFreeSince = twoFreeSince;
        this.oneFreeSince = oneFreeSince;
    }

    public SeatDto dto() {
        return new SeatDto(
                customers
        );
    }
    public SeatEntity() {
        this.id = 0;
        this.customers = new ArrayList<>(); // ✅ 必须初始化
        this.fourFreeSince = 0;
        this.threeFreeSince = 0;
        this.twoFreeSince = 0;
        this.oneFreeSince = 0;
    }
}
