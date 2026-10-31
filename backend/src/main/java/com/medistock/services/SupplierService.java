package com.medistock.services;

import com.medistock.exception.BadRequestException;
import com.medistock.models.Supplier;
import com.medistock.repositories.SupplierRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SupplierService {
    private final SupplierRepository suppliers;

    public SupplierService(SupplierRepository suppliers) { this.suppliers = suppliers; }

    public List<Supplier> list() { return suppliers.findAllByOrderByNameAsc(); }

    public Supplier create(Supplier s) {
        s.setId(null);
        return suppliers.save(s);
    }

    public Supplier update(Long id, Supplier s) {
        if (!suppliers.existsById(id)) throw new BadRequestException("Supplier not found");
        s.setId(id);
        return suppliers.save(s);
    }

    public void delete(Long id) { suppliers.deleteById(id); }
}