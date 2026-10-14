-- Preferensi per user: pembayaran (DP/lunas) dari commission yang dibatalkan
-- tetap dihitung sebagai uang masuk (default: ya, DP biasanya tidak dikembalikan).
alter table settings add column count_cancelled_paid boolean not null default true;
