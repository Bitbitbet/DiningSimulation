package com.hbjtu.canteen.service.Impl;

import com.hbjtu.canteen.service.cantenService;
import org.springframework.stereotype.Service;

@Service
public class cantenServiceImpl implements cantenService {
    @Override
    public String getHello() {
        return "hello world";
    }
}
