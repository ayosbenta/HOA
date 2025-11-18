import React from 'react';
import Card from '../components/ui/Card';
import { ShieldCheck, Clock } from 'lucide-react';
import VisitorsPage from './VisitorsPage';
import { useAuth } from '../contexts/AuthContext';


const StaffDashboard: React.FC = () => {
    const { user } = useAuth();
    if(!user) return null;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Security Dashboard</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <Card className="p-5 flex items-center">
                    <div className={`p-3 rounded-full bg-blue-100 mr-4`}>
                        <ShieldCheck className={`w-6 h-6 text-blue-500`} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Active Shift</p>
                        <p className="text-2xl font-bold text-gray-800">Gate 1</p>
                    </div>
                </Card>
                 <Card className="p-5 flex items-center">
                    <div className={`p-3 rounded-full bg-green-100 mr-4`}>
                        <Clock className={`w-6 h-6 text-green-500`} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Current Time</p>
                        <p className="text-2xl font-bold text-gray-800">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'})}</p>
                    </div>
                </Card>
            </div>
            
            {/* Embed the visitor log directly */}
            <div className="lg:col-span-3">
              <VisitorsPage user={user} />
            </div>
        </div>
    );
};

export default StaffDashboard;
