package com.medistock.services;

import com.medistock.exception.BadRequestException;
import com.medistock.models.*;
import com.medistock.repositories.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StockService {

    // ---- request bodies ----
    public record ReceiveRequest(@NotNull(message = "Choose a medicine") Long medicineId,
                                 Long supplierId,
                                 @NotBlank(message = "Batch number is required") String batchNumber,
                                 LocalDate manufactureDate,
                                 @NotNull(message = "Expiry date is required") LocalDate expiryDate,
                                 @Min(value = 1, message = "Quantity must be at least 1") int quantity,
                                 String note) {}

    public record IssueRequest(@NotNull(message = "Choose a medicine") Long medicineId,
                               @Min(value = 1, message = "Quantity must be at least 1") int quantity,
                               String note) {}

    public record AdjustRequest(@NotNull(message = "Choose a batch") Long batchId,
                                @NotNull(message = "Choose a type") TransactionType type,
                                @Min(value = 1, message = "Quantity must be at least 1") int quantity,
                                String note) {}

    private final MedicineRepository medicines;
    private final SupplierRepository suppliers;
    private final BatchRepository batches;
    private final StockTransactionRepository transactions;

    public StockService(MedicineRepository medicines, SupplierRepository suppliers,
                        BatchRepository batches, StockTransactionRepository transactions) {
        this.medicines = medicines;
        this.suppliers = suppliers;
        this.batches = batches;
        this.transactions = transactions;
    }

    /** Stock IN: a purchase creates a new batch (or tops up an existing batch with the same number). */
    @Transactional
    public Batch receive(ReceiveRequest r) {
        Medicine medicine = medicines.findById(r.medicineId())
                .orElseThrow(() -> new BadRequestException("Medicine not found"));
        if (r.expiryDate().isBefore(LocalDate.now()))
            throw new BadRequestException("Cannot receive a batch that is already expired");
        if (r.manufactureDate() != null && !r.manufactureDate().isBefore(r.expiryDate()))
            throw new BadRequestException("Manufacture date must be before the expiry date");

        Supplier supplier = null;
        if (r.supplierId() != null)
            supplier = suppliers.findById(r.supplierId())
                    .orElseThrow(() -> new BadRequestException("Supplier not found"));

        Batch batch = batches.findByMedicineIdAndBatchNumberIgnoreCase(medicine.getId(), r.batchNumber().trim())
                .orElseGet(() -> {
                    Batch b = new Batch();
                    b.setMedicine(medicine);
                    b.setBatchNumber(r.batchNumber().trim());
                    b.setManufactureDate(r.manufactureDate());
                    b.setExpiryDate(r.expiryDate());
                    b.setQuantity(0);
                    return b;
                });
        if (supplier != null) batch.setSupplier(supplier);
        batch.setQuantity(batch.getQuantity() + r.quantity());
        batch = batches.save(batch);

        transactions.save(new StockTransaction(batch, TransactionType.PURCHASE, r.quantity(), r.note()));
        return batch;
    }

    /** Stock OUT: issues from the batch that expires first (FEFO) and never from expired batches. */
    @Transactional
    public List<StockTransaction> issue(IssueRequest r) {
        if (!medicines.existsById(r.medicineId())) throw new BadRequestException("Medicine not found");

        List<Batch> usable = batches
                .findByMedicineIdAndQuantityGreaterThanOrderByExpiryDateAsc(r.medicineId(), 0).stream()
                .filter(b -> !"EXPIRED".equals(b.getStatus()))
                .toList();
        int available = usable.stream().mapToInt(Batch::getQuantity).sum();
        if (available < r.quantity())
            throw new BadRequestException("Only " + available + " usable units available (expired stock cannot be issued)");

        List<StockTransaction> created = new ArrayList<>();
        int remaining = r.quantity();
        for (Batch b : usable) {
            if (remaining == 0) break;
            int take = Math.min(remaining, b.getQuantity());
            b.setQuantity(b.getQuantity() - take);
            batches.save(b);
            created.add(transactions.save(new StockTransaction(b, TransactionType.ISSUE, take, r.note())));
            remaining -= take;
        }
        return created;
    }

    /** RETURN adds units back to a batch; WRITE_OFF removes damaged or expired units from a batch. */
    @Transactional
    public StockTransaction adjust(AdjustRequest r) {
        if (r.type() != TransactionType.RETURN && r.type() != TransactionType.WRITE_OFF)
            throw new BadRequestException("Use Return or Write-off here");
        Batch batch = batches.findById(r.batchId())
                .orElseThrow(() -> new BadRequestException("Batch not found"));

        if (r.type() == TransactionType.WRITE_OFF) {
            if (r.quantity() > batch.getQuantity())
                throw new BadRequestException("Batch only has " + batch.getQuantity() + " units");
            batch.setQuantity(batch.getQuantity() - r.quantity());
        } else {
            if ("EXPIRED".equals(batch.getStatus()))
                throw new BadRequestException("Cannot return stock into an expired batch");
            batch.setQuantity(batch.getQuantity() + r.quantity());
        }
        batches.save(batch);
        return transactions.save(new StockTransaction(batch, r.type(), r.quantity(), r.note()));
    }

    public List<StockTransaction> history() {
        return transactions.findTop100ByOrderByCreatedAtDescIdDesc();
    }
}
