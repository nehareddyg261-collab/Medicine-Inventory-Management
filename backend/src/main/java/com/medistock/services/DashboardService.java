package com.medistock.services;

import com.medistock.models.Batch;
import com.medistock.models.StockTransaction;
import com.medistock.models.TransactionType;
import com.medistock.repositories.StockTransactionRepository;
import com.medistock.repositories.SupplierRepository;
import com.medistock.services.MedicineService.MedicineSummary;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;
import org.springframework.stereotype.Service;

/**
 * Builds everything the dashboard needs in one call, including the demand forecast.
 *
 * Forecast method: for every medicine, take the units ISSUED in each of the last 6 complete
 * months, fit a straight line (least squares) and extend it for the next 3 months.
 */
@Service
public class DashboardService {

    private static final int HISTORY_MONTHS = 6;
    private static final int FORECAST_MONTHS = 3;
    private static final int EXPIRY_WINDOW_DAYS = 60;

    // ---- response shapes ----
    public record LowStockItem(Long medicineId, String name, int totalStock, int reorderLevel) {}
    public record ExpiryItem(Long batchId, String medicineName, String batchNumber, LocalDate expiryDate,
                             long daysLeft, int quantity, String status) {}
    public record MonthPoint(String label, int issued, boolean forecast) {}
    public record ReorderItem(Long medicineId, String name, int forecastNextMonth, int currentStock, int suggested) {}
    public record DashboardData(int totalMedicines, int totalSuppliers, BigDecimal stockValue,
                                int lowStockCount, int expiringSoonCount, int expiredCount,
                                List<LowStockItem> lowStock, List<ExpiryItem> expiryAlerts,
                                List<MonthPoint> demand, List<ReorderItem> reorders,
                                List<StockTransaction> recentTransactions) {}

    private final MedicineService medicineService;
    private final BatchService batchService;
    private final SupplierRepository suppliers;
    private final StockTransactionRepository transactions;

    public DashboardService(MedicineService medicineService, BatchService batchService,
                            SupplierRepository suppliers, StockTransactionRepository transactions) {
        this.medicineService = medicineService;
        this.batchService = batchService;
        this.suppliers = suppliers;
        this.transactions = transactions;
    }

    public DashboardData build() {
        List<MedicineSummary> meds = medicineService.list(null);

        BigDecimal stockValue = meds.stream()
                .map(m -> m.unitPrice().multiply(BigDecimal.valueOf(m.totalStock())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<LowStockItem> lowStock = meds.stream()
                .filter(m -> !"OK".equals(m.stockStatus()))
                .map(m -> new LowStockItem(m.id(), m.name(), m.totalStock(), m.reorderLevel()))
                .sorted(Comparator.comparingInt(LowStockItem::totalStock))
                .toList();

        List<ExpiryItem> expiry = batchService.expiringWithin(EXPIRY_WINDOW_DAYS).stream()
                .map(this::toExpiryItem).toList();
        int expiringSoon = (int) expiry.stream().filter(e -> "EXPIRING_SOON".equals(e.status())).count();
        int expired = (int) expiry.stream().filter(e -> "EXPIRED".equals(e.status())).count();

        // ----- demand history + forecast -----
        YearMonth thisMonth = YearMonth.now();
        YearMonth firstMonth = thisMonth.minusMonths(HISTORY_MONTHS);
        List<StockTransaction> issues = transactions.findByTypeAndCreatedAtAfter(
                TransactionType.ISSUE, firstMonth.atDay(1).atStartOfDay().minusSeconds(1));

        // medicineId -> [issued in month 0..5] (oldest first)
        Map<Long, double[]> perMedicine = new HashMap<>();
        for (StockTransaction t : issues) {
            YearMonth ym = YearMonth.from(t.getCreatedAt());
            if (!ym.isBefore(thisMonth)) continue;               // only complete months
            int idx = (int) java.time.temporal.ChronoUnit.MONTHS.between(firstMonth, ym);
            if (idx < 0 || idx >= HISTORY_MONTHS) continue;
            perMedicine.computeIfAbsent(t.getBatch().getMedicine().getId(), k -> new double[HISTORY_MONTHS])[idx] += t.getQuantity();
        }

        int[] history = new int[HISTORY_MONTHS];
        int[] forecastTotals = new int[FORECAST_MONTHS];
        List<ReorderItem> reorders = new ArrayList<>();

        for (MedicineSummary m : meds) {
            double[] y = perMedicine.get(m.id());
            if (y == null) continue;
            for (int i = 0; i < HISTORY_MONTHS; i++) history[i] += (int) y[i];

            int[] f = forecast(y);
            for (int i = 0; i < FORECAST_MONTHS; i++) forecastTotals[i] += f[i];

            // enough for next month plus a safety stock equal to the reorder level
            int suggested = Math.max(0, f[0] + m.reorderLevel() - m.totalStock());
            if (suggested > 0) reorders.add(new ReorderItem(m.id(), m.name(), f[0], m.totalStock(), suggested));
        }
        reorders.sort(Comparator.comparingInt(ReorderItem::suggested).reversed());

        List<MonthPoint> demand = new ArrayList<>();
        for (int i = 0; i < HISTORY_MONTHS; i++)
            demand.add(new MonthPoint(label(firstMonth.plusMonths(i)), history[i], false));
        for (int i = 0; i < FORECAST_MONTHS; i++)
            demand.add(new MonthPoint(label(thisMonth.plusMonths(i)), forecastTotals[i], true));

        return new DashboardData(meds.size(), (int) suppliers.count(), stockValue,
                lowStock.size(), expiringSoon, expired,
                lowStock.stream().limit(6).toList(),
                expiry.stream().limit(6).toList(),
                demand, reorders.stream().limit(6).toList(),
                transactions.findTop5ByOrderByCreatedAtDescIdDesc());
    }

    /** Least-squares straight line through the monthly values, extended FORECAST_MONTHS ahead. */
    static int[] forecast(double[] y) {
        int n = y.length;
        double sx = 0, sy = 0, sxy = 0, sxx = 0;
        for (int x = 0; x < n; x++) {
            sx += x; sy += y[x]; sxy += x * y[x]; sxx += (double) x * x;
        }
        double denom = n * sxx - sx * sx;
        double slope = denom == 0 ? 0 : (n * sxy - sx * sy) / denom;
        double intercept = (sy - slope * sx) / n;
        int[] out = new int[FORECAST_MONTHS];
        for (int i = 0; i < FORECAST_MONTHS; i++)
            out[i] = (int) Math.max(0, Math.round(intercept + slope * (n + i)));
        return out;
    }

    private ExpiryItem toExpiryItem(Batch b) {
        return new ExpiryItem(b.getId(), b.getMedicine().getName(), b.getBatchNumber(),
                b.getExpiryDate(), b.getDaysToExpiry(), b.getQuantity(), b.getStatus());
    }

    private String label(YearMonth ym) {
        return ym.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
    }
}
