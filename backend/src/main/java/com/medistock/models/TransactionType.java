package com.medistock.models;

/** PURCHASE and RETURN add stock; ISSUE and WRITE_OFF remove stock. */
public enum TransactionType {
    PURCHASE(true), ISSUE(false), RETURN(true), WRITE_OFF(false);

    private final boolean stockIn;
    TransactionType(boolean stockIn) { this.stockIn = stockIn; }
    public boolean isStockIn() { return stockIn; }
}