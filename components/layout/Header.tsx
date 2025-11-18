
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, UserCircle } from 'lucide-react';

interface HeaderProps {
    pageTitle: string;
    toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, toggleSidebar }) => {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="text-gray-500 mr-4 md:hidden">
            <Menu size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{pageTitle}</h1>
      </div>
      <div className="flex items-center">
        <div className="text-right mr-4 hidden sm:block">
            <p className="font-semibold text-gray-700">{user?.full_name}</p>
            <p className="text-sm text-gray-500">{user?.role}</p>
        </div>
        <UserCircle size={40} className="text-brand-primary" />
      </div>
    </header>
  );
};

export default Header;
