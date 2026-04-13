package com.hbjtu.canteen.Controller;

import com.hbjtu.canteen.service.CanteenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CanteenController {
    @Autowired
    private CanteenService canteenService;
    @GetMapping("/status")
    public String getHello(){
        return canteenService.getHello();
    }
}
