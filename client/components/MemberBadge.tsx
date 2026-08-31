import { forwardRef } from "react";

interface MemberBadgeProps {
  firstName: string;
  lastName: string;
  memberId: string;
  gender?: string;
  patrol?: string;
  role?: string;
  qrCodeUrl: string;
}

/**
 * Physical, printable member badge (standard ID-card size, CR80: 85.6mm x
 * 54mm at 300dpi = 1011x638px). Designed to be laminated/printed and
 * carried by the member -- the member IS the badge; no phone required.
 * The QR here encodes the AES-256-GCM encrypted payload from
 * lib/badgeCrypto.ts, which a
 * "chef" scans with their own device to pull up the member's full record.
 */
export const MemberBadge = forwardRef<HTMLDivElement, MemberBadgeProps>(
  ({ firstName, lastName, memberId, gender, patrol, role, qrCodeUrl }, ref) => {
    const genderLabel = gender === "male" ? "ذكر" : gender === "female" ? "أنثى" : "";

    return (
      <div
        ref={ref}
        dir="rtl"
        style={{
          width: "1011px",
          height: "638px",
          boxSizing: "border-box",
          borderRadius: "28px",
          overflow: "hidden",
          fontFamily: "Arial, Tahoma, sans-serif",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
          position: "relative",
        }}
      >
        {/* Header band */}
        <div
          style={{
            background: "linear-gradient(90deg, #7f1d1d, #b91c1c 55%, #f59e0b)",
            padding: "26px 40px",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: "16px", opacity: 0.9 }}>الكشفية الحسنية صفي</p>
            <p style={{ margin: "2px 0 0", fontSize: "12px", opacity: 0.75 }}>SHM Safi Maroc — بطاقة العضوية</p>
          </div>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.8)",
              display: "grid",
              placeItems: "center",
              fontSize: "16px",
              fontWeight: 800,
            }}
          >
            SHM
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", padding: "32px 40px", gap: "32px", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>الاسم الكامل</p>
            <h1 style={{ margin: "6px 0 18px", fontSize: "34px", color: "#0f172a" }}>
              {firstName} {lastName}
            </h1>

            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "18px" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "8px 18px",
                  borderRadius: "999px",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "20px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                }}
              >
                {memberId}
              </span>
              {genderLabel && (
                <span
                  style={{
                    display: "inline-block",
                    padding: "8px 18px",
                    borderRadius: "999px",
                    background: "#f1f5f9",
                    color: "#334155",
                    fontSize: "16px",
                    fontWeight: 700,
                  }}
                >
                  {genderLabel}
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
              {patrol && (
                <div>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>الفريق</p>
                  <p style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>{patrol}</p>
                </div>
              )}
              {role && (
                <div>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>الدور</p>
                  <p style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>{role}</p>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              width: "220px",
              textAlign: "center",
              padding: "18px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "20px",
            }}
          >
            <img
              src={qrCodeUrl}
              alt="رمز العضو"
              style={{ width: "180px", height: "180px", display: "block", margin: "0 auto 10px" }}
            />
            <p style={{ margin: 0, color: "#64748b", fontSize: "11px" }}>يُمسح من طرف المؤطر</p>
          </div>
        </div>

        {/* Footer strip -- reserved space visually signals where an NFC chip
            would sit in a future physical badge revision. */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "12px 40px",
            background: "#0f172a",
            color: "#cbd5e1",
            fontSize: "11px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>بطاقة عضوية رسمية — غير قابلة للتحويل</span>
          <span>NFC-Ready</span>
        </div>
      </div>
    );
  },
);

MemberBadge.displayName = "MemberBadge";
