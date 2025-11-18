import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { getAllUsers, updateUserRole } from '../services/mockApi';
import { User, UserRole } from '../types';
import { Users, CheckCircle } from 'lucide-react';

const ManageRolesPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingStatus, setSavingStatus] = useState<{[key: string]: boolean}>({});
    const [successStatus, setSuccessStatus] = useState<{[key: string]: boolean}>({});

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const data = await getAllUsers();
                setUsers(data);
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

    const handleSaveChanges = async (userId: string, newRole: UserRole) => {
        setSavingStatus(prev => ({ ...prev, [userId]: true }));
        try {
            await updateUserRole(userId, newRole);
            setSuccessStatus(prev => ({...prev, [userId]: true}));
            setTimeout(() => {
                setSuccessStatus(prev => ({...prev, [userId]: false}));
            }, 2000);
        } catch (error) {
            console.error("Failed to update user role", error);
            // Here you might want to show an error toast
        } finally {
            setSavingStatus(prev => ({ ...prev, [userId]: false }));
        }
    };
    
    return (
         <Card>
            <div className="p-5 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Users className="mr-2 text-brand-secondary"/>
                    Manage User Roles
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
                                <th scope="col" className="px-6 py-3">Current Role</th>
                                <th scope="col" className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.user_id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.full_name}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">{`B${user.block} L${user.lot}`}</td>
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
                                            onClick={() => handleSaveChanges(user.user_id, user.role)}
                                            disabled={savingStatus[user.user_id]}
                                            className="w-24 text-center font-medium text-white bg-brand-primary hover:bg-brand-dark px-3 py-2 rounded-md text-xs disabled:bg-gray-400"
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
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Card>
    );
};

export default ManageRolesPage;