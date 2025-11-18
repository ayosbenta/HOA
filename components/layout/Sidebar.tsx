
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { X, LogOut, LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  icon: LucideIcon;
}

interface SidebarProps {
  navItems: NavItem[];
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ navItems, currentPage, setCurrentPage, isOpen, setIsOpen }) => {
  const { logout } = useAuth();

  const handleNavClick = (page: string) => {
    setCurrentPage(page);
    if (window.innerWidth < 768) { // md breakpoint
        setIsOpen(false);
    }
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsOpen(false)}></div>
      <aside className={`absolute md:relative inset-y-0 left-0 bg-brand-dark text-white w-64 space-y-6 py-7 px-2 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out z-40 flex flex-col`}>
        <div className="px-4 flex justify-between items-center">
            <a href="#" className="text-white text-2xl font-extrabold tracking-wider">
              HOA<span className="text-brand-secondary">Connect</span>
            </a>
            <button onClick={() => setIsOpen(false)} className="md:hidden text-white">
                <X size={24} />
            </button>
        </div>
        
        <nav className="flex-grow">
          {navItems.map((item) => (
            <a
              key={item.name}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(item.name);
              }}
              className={`flex items-center py-2.5 px-4 my-2 rounded-lg transition duration-200 ${
                currentPage === item.name
                  ? 'bg-brand-primary text-white'
                  : 'hover:bg-brand-primary/50 hover:text-white'
              }`}
            >
              <item.icon className="mr-3" size={20} />
              {item.name}
            </a>
          ))}
        </nav>

        <div>
            <button
                onClick={logout}
                className="w-full flex items-center py-2.5 px-4 rounded-lg transition duration-200 text-red-300 hover:bg-red-500 hover:text-white"
            >
                <LogOut className="mr-3" size={20} />
                Logout
            </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
