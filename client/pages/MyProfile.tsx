import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api-config";
import { useNetworkStatus } from "@/lib/offline/network";
import { cacheMemberProfile, getCachedMemberProfile } from "@/lib/offline/memberCache";
import type { OfflineMemberProfile } from "@/lib/offline/types";
import { WifiOff } from "lucide-react";

interface MemberProfile {
  id: string;
  generated_id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  age: number;
  gender: string;
  patrol_id: number;
  role_id: number;
  is_high_patrol: boolean;
  user_phone: string;
  guardian_first_name: string;
  guardian_last_name: string;
  guardian_relationship: string;
  guardian_cin: string;
  father_phone: string;
  mother_phone: string;
  home_phone: string;
  additional_info: string;
  pdf_url: string;
  qr_code_url: string;
  documents_generated_at: string;
  payment_completed: boolean;
  documents_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface PatrolInfo {
  id: number;
  name: string;
}

interface RoleInfo {
  id: number;
  name: string;
}

function toOfflineProfile(data: MemberProfile, patrolName?: string | null, roleName?: string | null): OfflineMemberProfile {
  return {
    id: data.id,
    generated_id: data.generated_id,
    first_name: data.first_name,
    last_name: data.last_name,
    birth_date: data.birth_date,
    gender: data.gender,
    user_phone: data.user_phone,
    home_phone: data.home_phone,
    father_phone: data.father_phone,
    mother_phone: data.mother_phone,
    patrol_id: data.patrol_id != null ? String(data.patrol_id) : null,
    patrol_name: patrolName ?? null,
    role_id: data.role_id != null ? String(data.role_id) : null,
    role_name: roleName ?? null,
    is_high_patrol: data.is_high_patrol,
    guardian_first_name: data.guardian_first_name,
    guardian_last_name: data.guardian_last_name,
    guardian_relationship: data.guardian_relationship,
    guardian_cin: data.guardian_cin,
    additional_info: data.additional_info,
    pdf_url: data.pdf_url,
    qr_code_url: data.qr_code_url,
    documents_generated_at: data.documents_generated_at,
    payment_completed: data.payment_completed,
    documents_completed: data.documents_completed,
  };
}

function computeAge(birthDateStr: string): number {
  if (!birthDateStr) return 0;
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function fromOfflineProfile(data: OfflineMemberProfile): MemberProfile {
  return {
    id: data.id,
    generated_id: data.generated_id,
    first_name: data.first_name,
    last_name: data.last_name,
    birth_date: data.birth_date,
    age: computeAge(data.birth_date),
    gender: data.gender,
    patrol_id: data.patrol_id as unknown as number,
    role_id: data.role_id as unknown as number,
    is_high_patrol: !!data.is_high_patrol,
    user_phone: data.user_phone,
    guardian_first_name: data.guardian_first_name || "",
    guardian_last_name: data.guardian_last_name || "",
    guardian_relationship: data.guardian_relationship || "",
    guardian_cin: data.guardian_cin || "",
    father_phone: data.father_phone || "",
    mother_phone: data.mother_phone || "",
    home_phone: data.home_phone || "",
    additional_info: data.additional_info || "",
    pdf_url: data.pdf_url || "",
    qr_code_url: data.qr_code_url || "",
    documents_generated_at: data.documents_generated_at || "",
    payment_completed: !!data.payment_completed,
    documents_completed: !!data.documents_completed,
    created_at: "",
    updated_at: "",
  };
}

export default function MyProfile() {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [patrol, setPatrol] = useState<PatrolInfo | null>(null);
  const [role, setRole] = useState<RoleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFromCache, setIsFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "guardian" | "documents">("personal");

  useEffect(() => {
    let cancelled = false;

    const loadFromCache = async (memberId: string) => {
      const cached = await getCachedMemberProfile(memberId);
      if (cached && !cancelled) {
        setProfile(fromOfflineProfile(cached.data));
        if (cached.data.patrol_name) setPatrol({ id: 0 as unknown as number, name: cached.data.patrol_name } as PatrolInfo);
        if (cached.data.role_name) setRole({ id: 0 as unknown as number, name: cached.data.role_name } as RoleInfo);
        setIsFromCache(true);
        setCachedAt(cached.cachedAt);
        return true;
      }
      return false;
    };

    const fetchProfile = async () => {
      const generatedId = user?.generated_id;
      if (!user?.id && !generatedId) {
        setError("Utilisateur non authentifié");
        setLoading(false);
        return;
      }

      // Offline: skip straight to cache, never show a blank/error page.
      if (!isOnline) {
        const memberIdForCache = user?.id || generatedId!;
        const found = await loadFromCache(memberIdForCache);
        if (!found) setError("لا تتوفر بيانات محفوظة بعد. يرجى الاتصال بالإنترنت مرة واحدة على الأقل.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(apiUrl(`/api/auth/profile?generated_id=${encodeURIComponent(generatedId!)}`));
        const data = await response.json().catch(() => null);

        if (!response.ok || !data) {
          console.error("Erreur profil:", data?.error);
          // Network reachable but query failed: fall back to any cached copy
          // rather than leaving the member with a dead end.
          const memberIdForCache = user?.id || generatedId!;
          const found = await loadFromCache(memberIdForCache);
          if (!found) setError("Impossible de charger les données");
          return;
        }

        const patrolName: string | null = data.patrol_name ?? null;
        const roleName: string | null = data.role_name ?? null;
        if (patrolName) setPatrol({ id: data.patrol_id, name: patrolName } as PatrolInfo);
        if (roleName) setRole({ id: data.role_id, name: roleName } as RoleInfo);

        if (cancelled) return;
        setProfile(data as MemberProfile);
        setIsFromCache(false);
        setCachedAt(null);

        await cacheMemberProfile(data.id, toOfflineProfile(data as MemberProfile, patrolName, roleName));
      } catch (err) {
        console.error("Erreur:", err);
        // Any unexpected failure (including a network blip mid-request):
        // try the cache before giving up.
        const memberIdForCache = user?.id || generatedId!;
        const found = await loadFromCache(memberIdForCache);
        if (!found) setError("Erreur lors du chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [user, isOnline]);

  if (loading) {
    return (
      <Layout currentPage="account">
        <div className="flex justify-center items-center min-h-96">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout currentPage="account">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600 font-bold">{error || "Erreur lors du chargement"}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="account">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-l from-red-600 to-purple-600 bg-clip-text text-transparent mb-2">
          حسابي
        </h1>
        <p className="text-gray-600">
          معرّفك: <span className="font-bold text-purple-600">{profile.generated_id}</span>
        </p>
        {isFromCache && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-800">
            <WifiOff size={14} />
            وضعية عدم الاتصال — بيانات محفوظة
            {cachedAt && (
              <span className="font-normal text-amber-700">
                (آخر تحديث: {new Date(cachedAt).toLocaleString("ar-MA")})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { id: "personal", label: "المعلومات الشخصية" },
          { id: "guardian", label: "معلومات الولي" },
          { id: "documents", label: "المستندات" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-3 font-bold border-b-4 transition-all ${
              activeTab === tab.id
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Personal Info Tab */}
      {activeTab === "personal" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Carte: Infos Basiques */}
          <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-purple-600">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-purple-200">
              البيانات الأساسية
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">الاسم</p>
                <p className="text-lg font-semibold">{profile.first_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">النسب</p>
                <p className="text-lg font-semibold">{profile.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">الجنس</p>
                <p className="text-lg font-semibold">
                  {profile.gender === "male" ? "ذكر" : "أنثى"}
                </p>
              </div>
            </div>
          </div>

          {/* Carte: Infos Kachaffah */}
          <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-red-600">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-red-200">
              معلومات الكشفية
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">الدورية</p>
                <p className="text-lg font-semibold">{patrol?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">الدور</p>
                <p className="text-lg font-semibold">{role?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">الدورية العليا</p>
                <p className="text-lg font-semibold">
                  {profile.is_high_patrol ? "✓ نعم" : "✗ لا"}
                </p>
              </div>
            </div>
          </div>

          {/* Carte: Données Personnelles */}
          <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-green-600">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-green-200">
              تاريخ الميلاد
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">التاريخ</p>
                <p className="text-lg font-semibold">
                  {new Date(profile.birth_date).toLocaleDateString("ar-MA")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">العمر</p>
                <p className="text-2xl font-bold text-green-600">{profile.age} سنة</p>
              </div>
            </div>
          </div>

          {/* Carte: الاتصال */}
          <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-blue-600">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-blue-200">
              معلومات الاتصال
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">الهاتف</p>
                <p className="text-lg font-semibold" dir="ltr">
                  {profile.user_phone}
                </p>
              </div>
              {profile.home_phone && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">الهاتف الثابت</p>
                  <p className="text-lg font-semibold" dir="ltr">
                    {profile.home_phone}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guardian Info Tab */}
      {activeTab === "guardian" && (
        <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-purple-600">
          <h3 className="text-lg font-bold text-gray-800 mb-6 pb-3 border-b-2 border-purple-200">
            بيانات الولي
          </h3>

          {profile.guardian_first_name ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase">الاسم</p>
                <p className="text-lg font-semibold">{profile.guardian_first_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">النسب</p>
                <p className="text-lg font-semibold">{profile.guardian_last_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">الصفة</p>
                <p className="text-lg font-semibold">{profile.guardian_relationship}</p>
              </div>
              {profile.guardian_cin && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">رقم الهوية</p>
                  <p className="text-lg font-semibold">{profile.guardian_cin}</p>
                </div>
              )}
              {profile.father_phone && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">هاتف الأب</p>
                  <p className="text-lg font-semibold" dir="ltr">
                    {profile.father_phone}
                  </p>
                </div>
              )}
              {profile.mother_phone && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">هاتف الأم</p>
                  <p className="text-lg font-semibold" dir="ltr">
                    {profile.mother_phone}
                  </p>
                </div>
              )}
              {profile.home_phone && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">الهاتف الثابت</p>
                  <p className="text-lg font-semibold" dir="ltr">
                    {profile.home_phone}
                  </p>
                </div>
              )}
              {profile.additional_info && (
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase">معلومات إضافية</p>
                  <p className="text-base text-gray-800 whitespace-pre-line">{profile.additional_info}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">لم يتم تقديم معلومات الولي</p>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          {profile.pdf_url && profile.qr_code_url ? (
            <>
              <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-blue-600">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  بطاقة العضو
                </h3>
                <div className="flex gap-4 flex-wrap items-center">
                  <a
                    href={profile.pdf_url}
                    download
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    📥 تحميل PDF
                  </a>
                  {profile.qr_code_url && (
                    <img
                      src={profile.qr_code_url}
                      alt="QR Code"
                      className="w-32 h-32 border-2 border-gray-300 rounded"
                    />
                  )}
                </div>
                {profile.documents_generated_at && (
                  <p className="text-xs text-gray-500 mt-3">
                    تم الإنشاء: {new Date(profile.documents_generated_at).toLocaleString("ar-MA")}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-700">لم يتم إنشاء المستندات بعد</p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
