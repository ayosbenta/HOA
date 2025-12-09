
import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import AdminDashboard from './pages/AdminDashboard';
import HomeownerDashboard from './pages/HomeownerDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AnnouncementsPage from './pages/AnnouncementsPage';
import BillingPage from './pages/BillingPage';
import VisitorsPage from './pages/VisitorsPage';
import SettingsPage from './pages/SettingsPage';
import ManageRolesPage from './pages/ManageRolesPage';
import FeeSchedulePage from './pages/FeeSchedulePage';
import AmenitiesPage from './pages/AmenitiesPage';
import CCTVPage from './pages/CCTVPage';
import FinancialReportsPage from './pages/FinancialReportsPage';
import ProjectsPage from './pages/ProjectsPage';
import { UserRole } from './types';
import { House, CreditCard, Users, ShieldCheck, Settings, Bell, CalendarCheck, Video, PieChart, ClipboardList } from 'lucide-react';
import RegistrationPage from './pages/RegistrationPage';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('Dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');
  const [viewItemId, setViewItemId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    if (authPage === 'login') {
      return <LoginPage onNavigateToRegister={() => setAuthPage('register')} />;
    }
    return <RegistrationPage onNavigateToLogin={() => setAuthPage('login')} />;
  }

  const handleViewApproval = (item: { id: string; type: string }) => {
    setViewItemId(item.id);
    if (item.type === 'New Member') {
      setCurrentPage('Manage Roles');
    } else if (item.type.startsWith('Amenity')) {
      setCurrentPage('Amenities');
    }
  };

  const getNavItems = (role: UserRole) => {
    const commonItems = [
      { name: 'Dashboard', icon: House },
      { name: 'Announcements', icon: Bell },
      { name: 'CCTV', icon: Video },
    ];

    if (role === UserRole.ADMIN) {
      return [
        ...commonItems,
        { name: 'Billing', icon: CreditCard },
        { name: 'Financial Reports', icon: PieChart },
        { name: 'Projects / Planning', icon: ClipboardList },
        { name: 'Manage Roles', icon: Users },
        { name: 'Visitors Log', icon: ShieldCheck },
        { name: 'Amenities', icon: CalendarCheck },
        { name: 'Settings', icon: Settings },
      ];
    }

    if (role === UserRole.HOMEOWNER) {
      return [
        ...commonItems,
        { name: 'Billing', icon: CreditCard },
        { name: 'Projects / Planning', icon: ClipboardList },
        { name: 'Visitors Pass', icon: ShieldCheck },
        { name: 'Amenities', icon: CalendarCheck },
      ];
    }
    
    return [
        { name: 'Dashboard', icon: House },
        { name: 'Visitors Log', icon: ShieldCheck },
        { name: 'CCTV', icon: Video },
    ]
  };
  
  const navItems = getNavItems(user.role);

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        if (user.role === UserRole.ADMIN) return <AdminDashboard onViewApproval={handleViewApproval} onNavigate={setCurrentPage} />;
        if (user.role === UserRole.HOMEOWNER) return <HomeownerDashboard />;
        if (user.role === UserRole.STAFF) return <StaffDashboard />;
        return <HomeownerDashboard />; // Fallback
      case 'Announcements':
        return <AnnouncementsPage />;
      case 'Billing':
        return <BillingPage user={user}/>;
      case 'Financial Reports':
        return <FinancialReportsPage />;
      case 'Projects / Planning':
        return <ProjectsPage />;
      case 'Visitors Pass':
      case 'Visitors Log':
        return <VisitorsPage user={user} />;
      case 'Amenities':
        return <AmenitiesPage user={user} viewReservationId={viewItemId} onViewComplete={() => setViewItemId(null)} />;
      case 'CCTV':
        return <CCTVPage />;
      case 'Settings':
        return <SettingsPage onNavigate={setCurrentPage} />;
      case 'Manage Roles':
        return <ManageRolesPage viewUserId={viewItemId} onViewComplete={() => setViewItemId(null)} />;
      case 'Fee Schedule':
        return <FeeSchedulePage />;
      default:
        if (user.role === UserRole.ADMIN) return <AdminDashboard onViewApproval={handleViewApproval} onNavigate={setCurrentPage} />;
        if (user.role === UserRole.STAFF) return <StaffDashboard />;
        return <HomeownerDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        navItems={navItems}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          pageTitle={currentPage}
          toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;
