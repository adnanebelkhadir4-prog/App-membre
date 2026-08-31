import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { hasPendingSyncItems } from "@/lib/offline/syncEngine";
import {
  LayoutDashboard,
  User,
  LogOut,
  Menu,
  X,
  Home,
  FileText,
  Settings,
  Users,
  ClipboardCheck,
  DatabaseZap,
  IdCard,
} from "lucide-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    {
      label: "الرئيسية",
      icon: Home,
      path: "/dashboard",
      color: "text-blue-600",
    },
    {
      label: "ملفي الشخصي",
      icon: User,
      path: "/my-profile",
      color: "text-green-600",
    },
    {
      label: "العضوية",
      icon: IdCard,
      path: "/membership",
      color: "text-pink-600",
    },
    {
      label: "التقارير",
      icon: FileText,
      path: "/reports",
      color: "text-red-600",
    },
    {
      label: "حصص",
      icon: Users,
      path: "/sessions",
      color: "text-purple-600",
    },
    {
      label: "الحضور",
      icon: ClipboardCheck,
      path: "/attendance",
      color: "text-emerald-600",
    },
    {
      label: "مساحة التخزين",
      icon: DatabaseZap,
      path: "/sync-cache",
      color: "text-slate-600",
    },
    {
      label: "صناديق الأفكار",
      icon: FileText,
      path: "/ideas",
      color: "text-yellow-600",
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Hamburger Button - visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-scout-purple text-white rounded-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay - mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-l-4 border-scout-purple shadow-lg transition-transform duration-300 z-40 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } w-64 lg:w-20 flex flex-col`}
      >
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-center border-b border-gray-200 bg-gradient-to-b from-scout-purple to-purple-600">
          <div className="text-white text-center">
            <div className="text-2xl font-bold">ش</div>
            <div className="text-xs">كشاف</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const active = isActive(item.path);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                      active
                        ? "bg-scout-purple text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <IconComponent
                      size={24}
                      className={`${
                        active ? "text-white" : item.color
                      } transition-colors`}
                    />
                    <span className="lg:hidden font-semibold">{item.label}</span>

                    {/* Tooltip for desktop */}
                    <div
                      className={`hidden lg:block absolute left-full ml-2 px-3 py-1 bg-gray-800 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
                    >
                      {item.label}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={async () => {
              const pending = await hasPendingSyncItems();
              if (
                pending &&
                !window.confirm(
                  "توجد بيانات لم تتم مزامنتها بعد (حضور أو وثائق). ستبقى محفوظة على هذا الجهاز وسيتم إرسالها تلقائيًا عند تسجيل الدخول مجددًا بنفس الحساب مع اتصال بالإنترنت.\n\nهل تريد تسجيل الخروج الآن رغم ذلك؟",
                )
              ) {
                return;
              }
              await logout();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 group relative"
          >
            <LogOut size={24} className="text-red-600" />
            <span className="lg:hidden font-semibold">تسجيل الخروج</span>

            {/* Tooltip for desktop */}
            <div className="hidden lg:block absolute left-full ml-2 px-3 py-1 bg-gray-800 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              تسجيل الخروج
            </div>
          </button>
        </div>
      </aside>

      {/* Main content spacer for desktop */}
      <div className="hidden lg:block lg:w-20" />
    </>
  );
}
