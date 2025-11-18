import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { getHomeownerDashboardData } from '../services/googleSheetsApi';
import { Announcement, Due } from '../types';
import { DollarSign, Bell, AlertCircle } from 'lucide-react';

const HomeownerDashboard: React.FC = () => {
    const { user } = useAuth();
    const [dues, setDues] = useState<Due[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                try {
                    setLoading(true);
                    const data = await getHomeownerDashboardData(user.user_id);
                    setDues(data.dues);
                    setAnnouncements(data.announcements);
                    setPendingRequestsCount(data.pendingRequestsCount);
                } catch (error) {
                    console.error("Failed to fetch dashboard data", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchData();
    }, [user]);

    if (loading) {
        return <div className="text-center p-8">Loading dashboard...</div>;
    }

    const outstandingDue = dues.find(d => d.status === 'unpaid' || d.status === 'overdue');

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Welcome back, {user?.full_name.split(' ')[0]}!</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className={`p-6 ${outstandingDue ? (outstandingDue.status === 'overdue' ? 'bg-red-50 border-red-200 border' : 'bg-yellow-50 border-yellow-200 border') : 'bg-green-50 border-green-200 border'}`}>
                        <div className="flex items-center">
                            <div className={`p-3 rounded-full mr-4 ${outstandingDue ? (outstandingDue.status === 'overdue' ? 'bg-red-100' : 'bg-yellow-100') : 'bg-green-100'}`}>
                                <DollarSign className={`w-8 h-8 ${outstandingDue ? (outstandingDue.status === 'overdue' ? 'text-red-600' : 'text-yellow-600') : 'text-green-600'}`} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800">Billing Status</h3>
                                {outstandingDue ? (
                                    <>
                                        <p className="text-3xl font-bold text-gray-900">₱{outstandingDue.total_due.toLocaleString()}</p>
                                        <p className="text-gray-600">Due for {outstandingDue.billing_month}</p>
                                        {outstandingDue.status === 'overdue' && <span className="text-sm font-semibold text-red-600 flex items-center mt-1"><AlertCircle size={16} className="mr-1"/> OVERDUE</span>}
                                    </>
                                ) : (
                                    <p className="text-2xl font-bold text-green-700">You are all paid up!</p>
                                )}
                            </div>
                        </div>
                        {outstandingDue && (
                            <button className="mt-4 w-full sm:w-auto px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors">
                                Pay Now
                            </button>
                        )}
                    </Card>
                </div>
                
                <Card className="p-6">
                     <h3 className="text-lg font-semibold text-gray-800 mb-4">My Requests</h3>
                     <div className="space-y-2 text-center">
                        <p className="text-4xl font-bold text-brand-primary">{pendingRequestsCount}</p>
                        <p className="text-gray-500">Pending Requests</p>
                        <button className="mt-2 w-full px-4 py-2 text-sm border border-brand-primary text-brand-primary font-semibold rounded-lg hover:bg-brand-light transition-colors">
                            View All Requests
                        </button>
                     </div>
                </Card>
            </div>

            <Card>
                <div className="p-5 border-b">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <Bell className="mr-2 text-brand-secondary"/> Recent Announcements
                    </h3>
                </div>
                <div className="p-5 space-y-4">
                    {announcements.length > 0 ? announcements.map(ann => (
                        <div key={ann.ann_id} className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-bold text-gray-800">{ann.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{ann.content.substring(0, 150)}...</p>
                            <p className="text-xs text-gray-400 mt-2">{new Date(ann.created_at).toLocaleDateString()} by {ann.created_by}</p>
                        </div>
                    )) : <p className="text-gray-500">No new announcements.</p>}
                </div>
            </Card>
        </div>
    );
};

export default HomeownerDashboard;