"use client"; // Cadangan terakhir jika root layout gagal; wajib punya <html> dan <body> sendiri.

// Di luar root layout (tanpa kamus): baca cookie bahasa langsung.
const TEXT = {
  id: { title: "Terjadi kesalahan", body: "Muat ulang halaman atau coba lagi beberapa saat lagi.", retry: "Coba lagi" },
  en: { title: "Something went wrong", body: "Reload the page or try again in a moment.", retry: "Try again" },
};

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const lang = typeof document !== "undefined" && /(?:^|; )lang=en(?:;|$)/.test(document.cookie) ? "en" : "id";
  const t = TEXT[lang];
  return (
    <html lang={lang}>
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ fontWeight: 600 }}>{t.title}</p>
          <p style={{ color: "#737373", fontSize: 14 }}>{t.body}</p>
          <button onClick={() => retry()} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e5e5", background: "#171717", color: "#fafafa" }}>
            {t.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
