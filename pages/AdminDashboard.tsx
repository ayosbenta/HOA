import React from 'react';
import Card from '../components/ui/Card';
import { DollarSign, FileText, Bell, Users } from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const summaryData = [
        { title: 'Dues Collected (This Month)', value: '₱125,300', icon: DollarSign, color: 'text-green-500', bgColor: 'bg-green-100' },
        { title: 'Pending Complaints', value: '8', icon: FileText, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
        { title: 'Upcoming Events', value: '2', icon: Bell, color: 'text-blue-500', bgColor: 'bg-blue-100' },
        { title: 'Active Members', value: '256', icon: Users, color: 'text-indigo-500', bgColor: 'bg-indigo-100' },
    ];

    const pendingApprovals = [
        { name: 'Juan Dela Cruz', type: 'New Member', date: '2023-10-27' },
        { name: 'Maria Clara', type: 'Facility Reservation', date: '2023-10-26' },
        { name: 'Jose Rizal', type: 'New Member', date: '2023-10-25' },
    ];

    const recentActivity = [
        { activity: 'New announcement posted: "Octoberfest Party"', time: '2 hours ago' },
        { activity: 'Payment received from B5 L12', time: '5 hours ago' },
        { activity: 'Complaint #1024 resolved', time: '1 day ago' },
        { activity: 'New visitor pass created for B8 L2', time: '1 day ago' },
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
                                {pendingApprovals.map((item, index) => (
                                    <tr key={index} className="bg-white border-b">
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4">{item.type}</td>
                                        <td className="px-6 py-4">{item.date}</td>
                                        <td className="px-6 py-4">
                                            <button className="font-medium text-brand-primary hover:underline">View</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card className="p-5">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button className="w-full text-left p-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">Create Announcement</button>
                        <button className="w-full text-left p-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">Add New Member</button>
                        <button className="w-full text-left p-3 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors">Generate Report</button>
                    </div>
                </Card>
            </div>
            
             <Card className="p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
                <ul className="space-y-4">
                    {recentActivity.map((item, index) => (
                        <li key={index} className="flex items-start">
                           <div className="flex-shrink-0 w-3 h-3 bg-brand-secondary rounded-full mt-1.5 mr-3"></div>
                           <div>
                               <p className="text-gray-700">{item.activity}</p>
                               <p className="text-xs text-gray-400">{item.time}</p>
                           </div>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    );
};

export default AdminDashboard;
