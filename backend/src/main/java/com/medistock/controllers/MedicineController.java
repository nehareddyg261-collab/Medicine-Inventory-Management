package com.medistock.controllers;

import com.medistock.models.Medicine;
import com.medistock.services.MedicineService;
import com.medistock.services.MedicineService.MedicineSummary;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/medicines")
public class MedicineController {
    private final MedicineService service;

    public MedicineController(MedicineService service) { this.service = service; }

    @GetMapping
    public List<MedicineSummary> list(@RequestParam(required = false) String q) { return service.list(q); }

    @PostMapping
    public Medicine create(@Valid @RequestBody Medicine m) { return service.create(m); }

    @PutMapping("/{id}")
    public Medicine update(@PathVariable Long id, @Valid @RequestBody Medicine m) { return service.update(id, m); }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.delete(id); }
}
