package com.medistock.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_transactions")
public class StockTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private Batch batch;

    @Enumerated(EnumType.STRING)
    @Column(name = "txn_type", nullable = false, length = 20)
    private TransactionType type;

    @Column(nullable = false)
    private int quantity;   // always positive; the type decides the direction

    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public StockTransaction() {}

    public StockTransaction(Batch batch, TransactionType type, int quantity, String note) {
        this.batch = batch;
        this.type = type;
        this.quantity = quantity;
        this.note = note;
    }

    public Long getId() { return id; }
    public Batch getBatch() { return batch; }
    public TransactionType getType() { return type; }
    public int getQuantity() { return quantity; }
    public String getNote() { return note; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}