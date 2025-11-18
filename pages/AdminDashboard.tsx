import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { getAdminDashboardData, getAllUsers } from '../services/googleSheetsApi';
import { AdminDashboardData, User } from '../types';
import { DollarSign, UserCheck, Bell, Users, PlusCircle, UserPlus, FileDown } from 'lucide-react';

interface AdminDashboardProps {
    onViewApproval: (item: { id: string; type: string }) => void;
    onNavigate: (page: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onViewApproval, onNavigate }) => {
    const [data, setData] = useState<AdminDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const dashboardData = await getAdminDashboardData();
                setData(dashboardData);
            } catch (error) {
                console.error("Failed to fetch admin dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleGenerateReport = async () => {
        setIsGeneratingReport(true);
        try {
            const users: User[] = await getAllUsers();

            const headers = ['User ID', 'Full Name', 'Email', 'Phone', 'Block', 'Lot', 'Status', 'Role', 'Date Created'];
            const csvRows = [headers.join(',')];

            for (const user of users) {
                const values = [
                    user.user_id,
                    `"${user.full_name}"`, // Enclose in quotes to handle commas in names
                    user.email,
                    user.phone,
                    user.block,
                    user.lot,
                    user.status,
                    user.role,
                    new Date(user.date_created).toLocaleDateString()
                ];
                csvRows.push(values.join(','));
            }

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `HOA_Members_Report_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

        } catch (error) {
            console.error("Failed to generate report:", error);
            alert("Could not generate the report. Please try again.");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!data) {
        return <div className="text-center p-8">Could not load dashboard data.</div>;
    }

    const summaryData = [
        { title: 'Dues Collected (This Month)', value: `₱${data.duesCollected.toLocaleString()}`, icon: DollarSign, color: 'text-green-500', bgColor: 'bg-green-100' },
        { title: 'Pending Approvals', value: data.pendingApprovalsCount, icon: UserCheck, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
        { title: 'Upcoming Events', value: data.upcomingEventsCount, icon: Bell, color: 'text-blue-500', bgColor: 'bg-blue-100' },
        { title: 'Active Homeowners', value: data.activeMembers, icon: Users, color: 'text-indigo-500', bgColor: 'bg-indigo-100' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryData.map((item, index) => (
                    <Card key={index} className="p-5 flex items-center">
                        <div className={`p-3 rounded-full ${item.bgColor} mr-4`}>
                            <item.icon className={`w-6 h-6 ${item.color}`} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{item.title}</p>
                            <p className="text-2xl font-bold text-gray-800">{item.value}</p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <div className="p-5">
                        <h3 className="text-lg font-semibold text-gray-800">Pending Approvals</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Name</th>
                                    <th scope="col" className="px-6 py-3">Request Type</th>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.pendingApprovals.length > 0 ? data.pendingApprovals.map((item) => (
                                    <tr key={item.id} className="bg-white border-b">
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4">{item.type}</td>
                                        <td className="px-6 py-4">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => onViewApproval(item)} 
                                                className="font-medium text-brand-primary hover:underline">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-gray-500">No pending approvals.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card className="p-5">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button onClick={() => onNavigate('Announcements')} className="w-full text-left p-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center">
                            <PlusCircle className="mr-2" size={20} /> Create Announcement
                        </button>
                        <button onClick={() => onNavigate('Manage Roles')} className="w-full text-left p-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center">
                            <UserPlus className="mr-2" size={20} /> Add New Member
                        </button>
                        <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="w-full text-left p-3 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors flex items-center disabled:bg-gray-400">
                           {isGeneratingReport ? (
                                <>
                                 <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                 Generating...
                                </>
                           ) : (
                                <>
                                <FileDown className="mr-2" size={20} /> Generate Report
                                </>
                           )}
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;