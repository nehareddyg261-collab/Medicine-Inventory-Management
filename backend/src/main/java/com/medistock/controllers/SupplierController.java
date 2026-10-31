package com.medistock.controllers;

import com.medistock.models.Supplier;
import com.medistock.services.SupplierService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {
    private final SupplierService service;

    public SupplierController(SupplierService service) { this.service = service; }

    @GetMapping
    public List<Supplier> list() { return service.list(); }

    @PostMapping
    public Supplier create(@Valid @RequestBody Supplier s) { return service.create(s); }

    @PutMapping("/{id}")
    public Supplier update(@PathVariable Long id, @Valid @RequestBody Supplier s) { return service.update(id, s); }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.delete(id); }
}