import { useEffect, useState } from "react";
import { Wifi, WifiOff, Loader2, Clock, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNetworkStatus } from "@/lib/offline/network";
import { useAutoSync, hasPendingSyncItems, runSync } from "@/lib/offline/syncEngine";

export default function OfflineStatusBar() {
  const { isAuthenticated, sessionValidity } = useAuth();
  const { status, isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useAutoSync(isOnline);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const pending = await hasPendingSyncItems();
      if (!cancelled) setPendingCount(pending);
    };
    void check();
    const intervalId = window.setInterval(check, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isOnline]);

  if (!isAuthenticated) return null;

  const expiringSoon = sessionValidity.status === "valid" && sessionValidity.expiringSoon;

  const handleManualSync = async () => {
    setIsSyncing(true);
    await runSync();
    setIsSyncing(false);
  };

  return (
    <div
      dir="rtl"
      className={`w-full px-4 py-1.5 text-xs flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b ${
        isOnline ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      <span className="flex items-center gap-1.5 font-bold">
        {status === "checking" ? (
          <>
            <Loader2 size={13} className="animate-spin" /> جارٍ التحقق من الاتصال...
          </>
        ) : isOnline ? (
          <>
            <Wifi size={13} /> متصل بالإنترنت
          </>
        ) : (
          <>
            <WifiOff size={13} /> وضعية عدم الاتصال — البيانات المحفوظة معروضة
          </>
        )}
      </span>

      {expiringSoon && sessionValidity.status === "valid" && (
        <span className="flex items-center gap-1.5 font-bold text-orange-700">
          <Clock size={13} />
          تنتهي الجلسة خلال {sessionValidity.daysRemaining} يوم — سجّل الدخول مجددًا قريبًا
        </span>
      )}

      {pendingCount && (
        <button
          type="button"
          onClick={handleManualSync}
          disabled={!isOnline || isSyncing}
          className="flex items-center gap-1.5 font-bold underline disabled:no-underline disabled:opacity-60"
        >
          <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "جارٍ المزامنة..." : "بيانات بانتظار المزامنة — اضغط للمزامنة الآن"}
        </button>
      )}
    </div>
  );
}
