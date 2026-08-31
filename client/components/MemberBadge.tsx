import { forwardRef } from "react";

interface MemberBadgeProps {
  firstName: string;
  lastName: string;
  birthDate?: string;
  memberId: string;
  patrol?: string;
  role?: string;
  guardianPhone?: string;
  qrCodeUrl: string;
}

const formatBirthDate = (birthDate?: string) => {
  if (!birthDate) return "";

  const [year, month, day] = birthDate.split("-");
  return year && month && day ? `${day}/${month}/${year}` : birthDate;
};

export const MemberBadge = forwardRef<HTMLDivElement, MemberBadgeProps>(
  ({ firstName, lastName, birthDate, memberId, patrol, role, guardianPhone, qrCodeUrl }, ref) => {
    const roleAndPatrol = [role, patrol ? `بدورية ${patrol}` : ""].filter(Boolean).join(" ");

    return (
      <div
        ref={ref}
        dir="rtl"
        style={{
          width: "1011px",
          height: "638px",
          boxSizing: "border-box",
          overflow: "hidden",
          position: "relative",
          backgroundColor: "#ffffff",
          backgroundImage: 'url("/member-card-background.webp")',
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
          fontFamily: "Arial, Tahoma, sans-serif",
          color: "#111827",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "175px",
            right: "120px",
            width: "520px",
            textAlign: "right",
            fontSize: "27px",
            fontWeight: 700,
            lineHeight: 1.55,
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: "35px", whiteSpace: "nowrap" }}>
            {firstName} {lastName}
          </p>
          <p style={{ margin: "0 0 7px" }}>تاريخ الميلاد: {formatBirthDate(birthDate)}</p>
          <p style={{ margin: "0 0 7px" }}>ID: {memberId}</p>
          <p style={{ margin: "0 0 7px" }}>{roleAndPatrol}</p>
          <p style={{ margin: 0 }}>رقم الولي: {guardianPhone || ""}</p>
        </div>

        <div
          style={{
            position: "absolute",
            left: "48px",
            top: "176px",
            width: "285px",
            height: "285px",
            padding: "12px",
            boxSizing: "border-box",
            background: "#ffffff",
            border: "5px solid #1f2937",
            borderRadius: "10px",
          }}
        >
          {qrCodeUrl && (
            <img
              src={qrCodeUrl}
              alt="رمز العضو"
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          )}
        </div>
      </div>
    );
  },
);

MemberBadge.displayName = "MemberBadge";
