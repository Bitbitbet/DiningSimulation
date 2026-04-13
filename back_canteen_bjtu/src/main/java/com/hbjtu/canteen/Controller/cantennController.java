package com.hbjtu.canteen.Controller;

import com.hbjtu.canteen.service.cantenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class cantennController {
    @Autowired
    private cantenService cantenservice;
    @GetMapping("/status")
    public String getHello(){
        return cantenservice.getHello();
    }
}
