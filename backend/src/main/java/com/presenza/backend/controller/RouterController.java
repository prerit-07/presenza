package com.presenza.backend.controller;

import com.presenza.backend.dto.request.RouterRequest;
import com.presenza.backend.dto.response.RouterResponse;
import com.presenza.backend.service.RouterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routers")
@RequiredArgsConstructor
public class RouterController {

    private final RouterService routerService;

    @GetMapping
    public List<RouterResponse> list() {
        return routerService.list();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public RouterResponse create(@Valid @RequestBody RouterRequest req) {
        return routerService.create(req);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public RouterResponse update(@PathVariable Long id, @RequestBody RouterRequest req) {
        return routerService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
    public void delete(@PathVariable Long id) {
        routerService.delete(id);
    }
}
