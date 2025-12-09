
import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { Project } from '../../types';

interface ProjectContributionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (amount: number) => void;
    project: Project | null;
}

const ProjectContributionModal: React.FC<ProjectContributionModalProps> = ({ isOpen, onClose, onSubmit, project }) => {
    const [amount, setAmount] = useState<string>('');
    const [error, setError] = useState('');

    if (!isOpen || !project) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = Number(amount);
        if (isNaN(value) || value <= 0) {
            setError('Please enter a valid amount.');
            return;
        }
        onSubmit(value);
        setAmount('');
        setError('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm transform transition-all">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Contribute to Project
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Project Name:</p>
                            <p className="font-bold text-gray-900">{project.name}</p>
                        </div>
                        
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Contribution Amount</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <DollarSign className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    name="amount"
                                    id="amount"
                                    className="block w-full rounded-md border-gray-300 pl-10 focus:border-brand-primary focus:ring-brand-primary sm:text-sm py-2 border"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(e.target.value);
                                        setError('');
                                    }}
                                    min="1"
                                />
                            </div>
                            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary border border-transparent rounded-md hover:bg-brand-dark">
                            Proceed to Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectContributionModal;
