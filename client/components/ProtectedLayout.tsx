import Sidebar from "./Sidebar";
import PrivateRoute from "./PrivateRoute";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <PrivateRoute>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 lg:ml-20">
          {children}
        </main>
      </div>
    </PrivateRoute>
  );
}
