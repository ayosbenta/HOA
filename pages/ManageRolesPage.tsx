import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { getAllUsers, updateUser } from '../services/googleSheetsApi';
import { User, UserRole } from '../types';
import { Users, CheckCircle } from 'lucide-react';

const ManageRolesPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [originalUsers, setOriginalUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingStatus, setSavingStatus] = useState<{[key: string]: boolean}>({});
    const [successStatus, setSuccessStatus] = useState<{[key: string]: boolean}>({});

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const data = await getAllUsers();
                setUsers(data);
                setOriginalUsers(JSON.parse(JSON.stringify(data))); // Deep copy for checking changes
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleRoleChange = (userId: string, newRole: UserRole) => {
        setUsers(users.map(user => user.user_id === userId ? { ...user, role: newRole } : user));
    };

    const handleStatusChange = (userId: string, newStatus: User['status']) => {
        setUsers(users.map(user => user.user_id === userId ? { ...user, status: newStatus } : user));
    };

    const handleSaveChanges = async (userId: string) => {
        const userToUpdate = users.find(u => u.user_id === userId);
        if (!userToUpdate) return;
        
        setSavingStatus(prev => ({ ...prev, [userId]: true }));
        try {
            await updateUser(userId, userToUpdate.role, userToUpdate.status);
            
            // Update original user state to reflect saved change
            setOriginalUsers(prev => prev.map(u => u.user_id === userId ? { ...userToUpdate } : u));
            
            setSuccessStatus(prev => ({...prev, [userId]: true}));
            setTimeout(() => {
                setSuccessStatus(prev => ({...prev, [userId]: false}));
            }, 2000);
        } catch (error) {
            console.error("Failed to update user", error);
            alert(`Error: Could not update user ${userToUpdate.full_name}.`);
            // Revert UI change on failure
            setUsers(originalUsers);
        } finally {
            setSavingStatus(prev => ({ ...prev, [userId]: false }));
        }
    };

    const getStatusChipClasses = (status: User['status']) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 ring-green-600/20';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 ring-yellow-600/20';
            case 'inactive':
                return 'bg-red-100 text-red-800 ring-red-600/20';
            default:
                return 'bg-gray-100 text-gray-800 ring-gray-500/10';
        }
    };
    
    return (
         <Card>
            <div className="p-5 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Users className="mr-2 text-brand-secondary"/>
                    Manage Users
                </h3>
            </div>
            <div className="overflow-x-auto">
                {loading ? (
                     <div className="text-center p-8">Loading users...</div>
                ) : (
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Full Name</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Block/Lot</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                <th scope="col" className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => {
                                const originalUser = originalUsers.find(u => u.user_id === user.user_id);
                                const hasChanged = originalUser?.role !== user.role || originalUser?.status !== user.status;

                                return (
                                <tr key={user.user_id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.full_name}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">{`B${user.block} L${user.lot}`}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.status}
                                            onChange={(e) => handleStatusChange(user.user_id, e.target.value as User['status'])}
                                            className={`w-full p-2 text-sm rounded-lg border-0 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-primary ${getStatusChipClasses(user.status)}`}
                                        >
                                            <option value="active">Active</option>
                                            <option value="pending">Pending</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.user_id, e.target.value as UserRole)}
                                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2"
                                        >
                                            {Object.values(UserRole).map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => handleSaveChanges(user.user_id)}
                                            disabled={savingStatus[user.user_id] || !hasChanged}
                                            className="w-24 text-center font-medium text-white bg-brand-primary hover:bg-brand-dark px-3 py-2 rounded-md text-xs disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {savingStatus[user.user_id] ? (
                                                <div className="w-4 h-4 mx-auto border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : successStatus[user.user_id] ? (
                                                <CheckCircle size={16} className="mx-auto" />
                                            ) : (
                                                'Save'
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                )}
            </div>
        </Card>
    );
};

export default ManageRolesPage;