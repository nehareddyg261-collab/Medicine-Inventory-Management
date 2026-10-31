package com.medistock.controllers;

import com.medistock.models.Batch;
import com.medistock.services.BatchService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/batches")
public class BatchController {
    private final BatchService service;

    public BatchController(BatchService service) { this.service = service; }

    /** GET /api/batches?medicineId=3 */
    @GetMapping
    public List<Batch> forMedicine(@RequestParam Long medicineId) { return service.forMedicine(medicineId); }

    /** GET /api/batches/expiring?days=90 */
    @GetMapping("/expiring")
    public List<Batch> expiring(@RequestParam(defaultValue = "90") int days) { return service.expiringWithin(days); }
}