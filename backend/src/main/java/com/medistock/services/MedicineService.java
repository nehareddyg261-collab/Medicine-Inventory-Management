package com.medistock.services;

import com.medistock.exception.BadRequestException;
import com.medistock.models.Batch;
import com.medistock.models.Medicine;
import com.medistock.repositories.BatchRepository;
import com.medistock.repositories.MedicineRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class MedicineService {

    /** A medicine plus its live stock figures (only non-expired batches count as usable stock). */
    public record MedicineSummary(Long id, String name, String category, String unit, int reorderLevel,
                                  BigDecimal unitPrice, int totalStock, int expiredStock,
                                  LocalDate nearestExpiry, String stockStatus) {}

    private final MedicineRepository medicines;
    private final BatchRepository batches;

    public MedicineService(MedicineRepository medicines, BatchRepository batches) {
        this.medicines = medicines;
        this.batches = batches;
    }

    public List<MedicineSummary> list(String query) {
        String q = query == null ? "" : query.trim().toLowerCase();
        Map<Long, List<Batch>> byMedicine = batches.findByQuantityGreaterThanOrderByExpiryDateAsc(0).stream()
                .collect(Collectors.groupingBy(b -> b.getMedicine().getId()));

        List<MedicineSummary> result = new ArrayList<>();
        for (Medicine m : medicines.findAllByOrderByNameAsc()) {
            boolean matches = q.isEmpty()
                    || m.getName().toLowerCase().contains(q)
                    || (m.getCategory() != null && m.getCategory().toLowerCase().contains(q));
            if (!matches) continue;

            List<Batch> list = byMedicine.getOrDefault(m.getId(), List.of());
            int usable = 0, expired = 0;
            LocalDate nearest = null;
            for (Batch b : list) {
                if ("EXPIRED".equals(b.getStatus())) {
                    expired += b.getQuantity();
                } else {
                    usable += b.getQuantity();
                    if (nearest == null || b.getExpiryDate().isBefore(nearest)) nearest = b.getExpiryDate();
                }
            }
            String status = usable == 0 ? "OUT_OF_STOCK" : usable <= m.getReorderLevel() ? "LOW" : "OK";
            result.add(new MedicineSummary(m.getId(), m.getName(), m.getCategory(), m.getUnit(),
                    m.getReorderLevel(), m.getUnitPrice(), usable, expired, nearest, status));
        }
        return result;
    }

    public Medicine create(Medicine m) {
        m.setId(null);
        return medicines.save(m);
    }

    public Medicine update(Long id, Medicine m) {
        if (!medicines.existsById(id)) throw new BadRequestException("Medicine not found");
        m.setId(id);
        return medicines.save(m);
    }

    public void delete(Long id) {
        medicines.deleteById(id);
    }
}