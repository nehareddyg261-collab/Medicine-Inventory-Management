package com.medistock.services;

import com.medistock.models.Batch;
import com.medistock.repositories.BatchRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BatchService {
    private final BatchRepository batches;

    public BatchService(BatchRepository batches) { this.batches = batches; }

    /** All batches of one medicine (including empty ones, so history stays visible). */
    public List<Batch> forMedicine(Long medicineId) {
        return batches.findByMedicineIdOrderByExpiryDateAsc(medicineId);
    }

    /** Batches that still hold stock and expire within the next N days (or are already expired). */
    public List<Batch> expiringWithin(int days) {
        return batches.findByQuantityGreaterThanOrderByExpiryDateAsc(0).stream()
                .filter(b -> b.getDaysToExpiry() <= days)
                .toList();
    }
}
