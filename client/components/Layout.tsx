import { Link } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import OfflineStatusBar from "./OfflineStatusBar";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "@/context/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  showHamburger?: boolean;
}

export default function Layout({ children, currentPage, showHamburger = true }: LayoutProps) {
  const { toggleSidebar } = useSidebar();
  const { isAuthenticated } = useAuth();
  const showNavigation = showHamburger && isAuthenticated;

  return (
    <div className="min-h-screen bg-scout-cream flex flex-col" dir="rtl">
      <Header hamburgerVisible={showNavigation} onHamburgerClick={toggleSidebar} />
      <OfflineStatusBar />
      {showNavigation && <Sidebar />}


      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
