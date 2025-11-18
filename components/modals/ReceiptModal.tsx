import React, { useState } from 'react';
import { User, Due, UserRole } from '../../types';
import { updatePaymentStatus } from '../../services/googleSheetsApi';
import { X, Check, ThumbsDown, Info } from 'lucide-react';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    due: Due | null;
    user: User;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, onUpdate, due, user }) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const payment = due?.payment;
    const isAdmin = user.role === UserRole.ADMIN;
    const isPendingReview = isAdmin && payment?.status === 'pending';

    const handleStatusUpdate = async (status: 'verified' | 'rejected') => {
        if (!payment) return;
        
        if (status === 'rejected' && !rejectionReason.trim()) {
            setError('Rejection reason is required.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            await updatePaymentStatus({
                paymentId: payment.payment_id,
                status: status,
                notes: status === 'rejected' ? rejectionReason : '',
            });
            onUpdate();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update status.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen || !due || !payment) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">
                        {isPendingReview ? 'Review Payment' : 'Payment Receipt'} for {due.billing_month}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-baseline">
                        <div>
                            <p className="text-sm text-gray-500">Total Amount Paid:</p>
                            <p className="text-2xl font-bold text-brand-dark">₱{payment.amount.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Date Paid:</p>
                            <p className="text-md font-semibold text-gray-700">{new Date(payment.date_paid).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {payment.status === 'rejected' && (
                        <div className="bg-orange-50 p-3 rounded-lg text-sm text-orange-700 flex items-start gap-2">
                           <Info size={18} className="flex-shrink-0 mt-0.5"/>
                           <div>
                                <span className="font-semibold">Payment Rejected:</span> {payment.notes || 'No reason provided.'}
                           </div>
                        </div>
                    )}

                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Payment Proof:</p>
                        <div className="w-full h-auto max-h-96 overflow-auto border rounded-lg flex justify-center items-center bg-gray-100">
                           <img src={payment.proof_url} alt="Proof of payment" className="max-w-full max-h-full object-contain" />
                        </div>
                    </div>
                    
                    {isPendingReview && (
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <h4 className="font-semibold text-gray-700">Admin Action</h4>
                             <div>
                                <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700">Rejection Reason (if applicable)</label>
                                <textarea
                                    id="rejectionReason"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={2}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                                    placeholder="e.g., Incorrect amount, unclear screenshot..."
                                ></textarea>
                            </div>
                            {error && <p className="text-sm text-red-600">{error}</p>}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        {isPendingReview ? 'Cancel' : 'Close'}
                    </button>
                    {isPendingReview && (
                        <>
                        <button 
                            type="button" 
                            onClick={() => handleStatusUpdate('rejected')}
                            disabled={isSubmitting || !rejectionReason.trim()}
                            className="w-28 flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:bg-gray-400">
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Reject'}
                        </button>
                        <button 
                            type="button" 
                            onClick={() => handleStatusUpdate('verified')}
                            disabled={isSubmitting}
                            className="w-28 flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:bg-gray-400">
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Approve'}
                        </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
