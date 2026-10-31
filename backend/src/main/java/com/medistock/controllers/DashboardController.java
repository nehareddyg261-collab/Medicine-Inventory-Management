package com.medistock.controllers;

import com.medistock.services.DashboardService;
import com.medistock.services.DashboardService.DashboardData;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService service;

    public DashboardController(DashboardService service) { this.service = service; }

    @GetMapping
    public DashboardData dashboard() { return service.build(); }
}