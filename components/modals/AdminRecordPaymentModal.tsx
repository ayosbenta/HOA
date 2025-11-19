import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { recordAdminCashPayment } from '../../services/googleSheetsApi';
import { Due } from '../../types';

interface AdminRecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    due: Due | null;
}

const AdminRecordPaymentModal: React.FC<AdminRecordPaymentModalProps> = ({ isOpen, onClose, onSuccess, due }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || !due) return null;

    const handleSubmit = async () => {
        setError('');
        setIsSubmitting(true);
        try {
            await recordAdminCashPayment(due.due_id);
            onSuccess();
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
                        Record Cash Payment
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="text-center">
                        <p className="text-sm text-gray-500">You are recording a payment for:</p>
                        <p className="text-xl font-bold text-gray-800">{due.full_name}</p>
                        <p className="text-sm text-gray-500">{`B${due.block} L${due.lot}`}</p>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-600">Amount for {new Date(due.billing_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}:</p>
                        <p className="text-4xl font-bold text-brand-dark">₱{due.total_due.toFixed(2)}</p>
                    </div>

                    <div className="text-center text-sm text-gray-600">
                        <p>By clicking confirm, you acknowledge that you have received this amount in cash. This action will mark the due as <span className="font-semibold">paid</span> and cannot be undone.</p>
                    </div>

                    {error && <p className="mt-2 text-sm text-red-600 text-center">{error}</p>}
                </div>
                
                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSubmit} 
                        disabled={isSubmitting} 
                        className="w-40 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                       {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <CheckCircle size={18} className="mr-2"/>
                                Confirm Payment
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminRecordPaymentModal;
