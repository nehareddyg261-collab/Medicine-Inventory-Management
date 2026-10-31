package com.medistock.controllers;

import com.medistock.models.Batch;
import com.medistock.models.StockTransaction;
import com.medistock.services.StockService;
import com.medistock.services.StockService.*;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stock")
public class StockController {
    private final StockService service;

    public StockController(StockService service) { this.service = service; }

    @PostMapping("/receive")
    public Batch receive(@Valid @RequestBody ReceiveRequest r) { return service.receive(r); }

    @PostMapping("/issue")
    public List<StockTransaction> issue(@Valid @RequestBody IssueRequest r) { return service.issue(r); }

    @PostMapping("/adjust")
    public StockTransaction adjust(@Valid @RequestBody AdjustRequest r) { return service.adjust(r); }

    @GetMapping("/transactions")
    public List<StockTransaction> history() { return service.history(); }
}