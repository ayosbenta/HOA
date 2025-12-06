import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { getHomeownerDashboardData, recordCashPaymentIntent } from '../services/googleSheetsApi';
import { Announcement, Due } from '../types';
import { DollarSign, Bell, AlertCircle } from 'lucide-react';
import PaymentMethodModal from '../components/modals/PaymentMethodModal';
import PaymentModal from '../components/modals/PaymentModal';

const HomeownerDashboard: React.FC = () => {
    const { user } = useAuth();
    const [dues, setDues] = useState<Due[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Payment Modal States
    const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isSubmittingCash, setIsSubmittingCash] = useState(false);
    const [selectedDue, setSelectedDue] = useState<Due | null>(null);

    const fetchData = useCallback(async () => {
        if (user) {
            try {
                // Only set loading true if it's the initial load to avoid UI flicker on updates
                if (dues.length === 0) setLoading(true);
                
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
    }, [user, dues.length]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePayNowClick = (due: Due) => {
        setSelectedDue(due);
        setIsMethodModalOpen(true);
    };

    const handleSelectGcash = () => {
        setIsMethodModalOpen(false);
        setIsPaymentModalOpen(true);
    };

    const handleSelectCash = async () => {
        if (!selectedDue) return;

        const confirmed = window.confirm(
            'You have selected to pay in cash. Please proceed to the HOA admin office during office hours to complete your payment.\n\nYour payment will be marked as "Pending" until an admin verifies receipt of your payment.'
        );

        if (confirmed) {
            setIsSubmittingCash(true);
            try {
                await recordCashPaymentIntent(selectedDue.due_id);
                setIsMethodModalOpen(false);
                setSelectedDue(null);
                fetchData();
            } catch (error) {
                console.error("Failed to record cash payment intent:", error);
                alert(`Error: ${error instanceof Error ? error.message : 'Could not proceed with cash payment.'}`);
            } finally {
                setIsSubmittingCash(false);
            }
        }
    };

    const handlePaymentSuccess = () => {
        setIsPaymentModalOpen(false);
        setSelectedDue(null);
        fetchData();
    };

    if (loading) {
        return <div className="text-center p-8">Loading dashboard...</div>;
    }

    // Find the most relevant outstanding due (Overdue or Unpaid)
    // Priority: Overdue -> Unpaid
    const outstandingDue = dues
        .filter(d => d.status === 'overdue' || d.status === 'unpaid')
        .sort((a, b) => {
             if (a.status === 'overdue' && b.status !== 'overdue') return -1;
             if (b.status === 'overdue' && a.status !== 'overdue') return 1;
             return new Date(a.billing_month).getTime() - new Date(b.billing_month).getTime();
        })[0];

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
                                        <p className="text-gray-600">Due for {new Date(outstandingDue.billing_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                        {outstandingDue.status === 'overdue' && <span className="text-sm font-semibold text-red-600 flex items-center mt-1"><AlertCircle size={16} className="mr-1"/> OVERDUE</span>}
                                    </>
                                ) : (
                                    <p className="text-2xl font-bold text-green-700">You are all paid up!</p>
                                )}
                            </div>
                        </div>
                        {outstandingDue && (
                            <div className="mt-4">
                                {outstandingDue.payment?.status === 'pending' ? (
                                    <button disabled className="w-full sm:w-auto px-6 py-2 bg-gray-300 text-gray-500 font-semibold rounded-lg cursor-not-allowed">
                                        {outstandingDue.payment.method === 'Cash' ? 'Pending Cash Payment' : 'Pending Verification'}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handlePayNowClick(outstandingDue)}
                                        className="w-full sm:w-auto px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors"
                                    >
                                        {outstandingDue.payment?.status === 'rejected' ? 'Resubmit Payment' : 'Pay Now'}
                                    </button>
                                )}
                            </div>
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

            <PaymentMethodModal
                isOpen={isMethodModalOpen}
                onClose={() => setIsMethodModalOpen(false)}
                due={selectedDue}
                onSelectGcash={handleSelectGcash}
                onSelectCash={handleSelectCash}
                isSubmittingCash={isSubmittingCash}
            />

            <PaymentModal 
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                due={selectedDue}
                onSuccess={handlePaymentSuccess}
            />
        </div>
    );
};

export default HomeownerDashboard;