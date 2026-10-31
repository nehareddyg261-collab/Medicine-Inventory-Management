package com.medistock.repositories;

import com.medistock.models.StockTransaction;
import com.medistock.models.TransactionType;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockTransactionRepository extends JpaRepository<StockTransaction, Long> {
    List<StockTransaction> findTop100ByOrderByCreatedAtDescIdDesc();
    List<StockTransaction> findTop5ByOrderByCreatedAtDescIdDesc();
    List<StockTransaction> findByTypeAndCreatedAtAfter(TransactionType type, LocalDateTime from);
}