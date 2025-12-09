
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, DollarSign } from 'lucide-react';
import { getAllUsers, createManualProjectContribution } from '../../services/googleSheetsApi';
import { Project, User } from '../../types';

interface AdminProjectContributionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    activeProjects: Project[];
}

const AdminProjectContributionModal: React.FC<AdminProjectContributionModalProps> = ({ isOpen, onClose, onSuccess, activeProjects }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchUsers = async () => {
                setLoadingUsers(true);
                try {
                    const data = await getAllUsers();
                    setUsers(data.filter(u => u.role === 'Homeowner' && u.status === 'active'));
                } catch (error) {
                    console.error("Failed to fetch users", error);
                } finally {
                    setLoadingUsers(false);
                }
            };
            fetchUsers();
            // Set first project as default if available
            if (activeProjects.length > 0) {
                setSelectedProjectId(activeProjects[0].project_id);
            }
            setAmount('');
            setSelectedUserId('');
            setError('');
        }
    }, [isOpen, activeProjects]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedProjectId || !selectedUserId || !amount) {
            setError('All fields are required.');
            return;
        }

        setIsSubmitting(true);
        try {
            await createManualProjectContribution({
                projectId: selectedProjectId,
                userId: selectedUserId,
                amount: Number(amount)
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Record Project Contribution
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="project" className="block text-sm font-medium text-gray-700">Select Project</label>
                            <select
                                id="project"
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                            >
                                {activeProjects.length === 0 ? (
                                    <option value="" disabled>No active projects</option>
                                ) : (
                                    activeProjects.map(proj => (
                                        <option key={proj.project_id} value={proj.project_id}>{proj.name}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="homeowner" className="block text-sm font-medium text-gray-700">Select Homeowner</label>
                            {loadingUsers ? (
                                <div className="mt-1 text-sm text-gray-500">Loading homeowners...</div>
                            ) : (
                                <select
                                    id="homeowner"
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                >
                                    <option value="">Select a Homeowner</option>
                                    {users.map(u => (
                                        <option key={u.user_id} value={u.user_id}>{u.full_name} ({`B${u.block} L${u.lot}`})</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Contribution Amount</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <DollarSign className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    name="amount"
                                    id="amount"
                                    className="block w-full pl-10 rounded-md border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm py-2 border"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="1"
                                />
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    </div>
                    
                    <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || activeProjects.length === 0} 
                            className="w-40 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                           {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <CheckCircle size={18} className="mr-2"/>
                                    Confirm
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminProjectContributionModal;
