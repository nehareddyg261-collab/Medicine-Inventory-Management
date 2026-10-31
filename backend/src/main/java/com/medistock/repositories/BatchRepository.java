package com.medistock.repositories;

import com.medistock.models.Batch;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BatchRepository extends JpaRepository<Batch, Long> {
    List<Batch> findByMedicineIdOrderByExpiryDateAsc(Long medicineId);
    List<Batch> findByQuantityGreaterThanOrderByExpiryDateAsc(int quantity);
    List<Batch> findByMedicineIdAndQuantityGreaterThanOrderByExpiryDateAsc(Long medicineId, int quantity);
    Optional<Batch> findByMedicineIdAndBatchNumberIgnoreCase(Long medicineId, String batchNumber);
}