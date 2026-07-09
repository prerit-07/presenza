package com.presenza.backend.controller;

import com.presenza.backend.dto.response.ActivityResponse;
import com.presenza.backend.service.ActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activity")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping
    public List<ActivityResponse> recent(@RequestParam(defaultValue = "20") int limit) {
        return activityService.recent(limit);
    }
}
