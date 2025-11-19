import React from 'react';
import { X, Smartphone, Landmark } from 'lucide-react';
import { Due } from '../../types';

interface PaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    due: Due | null;
    onSelectGcash: () => void;
    onSelectCash: () => void;
    isSubmittingCash: boolean;
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({ 
    isOpen, 
    onClose, 
    due, 
    onSelectGcash, 
    onSelectCash,
    isSubmittingCash 
}) => {
    if (!isOpen || !due) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm transform transition-all">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Choose Payment Method
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                     <div className="text-center">
                        <p className="text-sm text-gray-500">Payment for {due.billing_month}</p>
                        <p className="text-3xl font-bold text-brand-dark">₱{due.total_due.toFixed(2)}</p>
                    </div>

                    <div className="space-y-3">
                         <button 
                            onClick={onSelectGcash}
                            className="w-full flex items-center justify-center p-4 border-2 border-transparent bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 shadow-md">
                             <Smartphone className="mr-3 h-6 w-6" />
                             <span className="text-lg font-semibold">Pay with GCash</span>
                         </button>
                         <button 
                            onClick={onSelectCash}
                            disabled={isSubmittingCash}
                            className="w-full flex items-center justify-center p-4 border-2 border-gray-300 bg-white text-gray-700 rounded-lg hover:border-brand-primary hover:bg-brand-accent transition-all duration-300 shadow-sm disabled:bg-gray-200 disabled:cursor-not-allowed">
                             {isSubmittingCash ? (
                                 <div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                             ) : (
                                <>
                                 <Landmark className="mr-3 h-6 w-6" />
                                 <span className="text-lg font-semibold">Pay with Cash</span>
                                </>
                             )}
                         </button>
                    </div>
                </div>

                 <div className="p-4 bg-gray-50 border-t text-center">
                        <p className="text-xs text-gray-500">For cash payments, please proceed to the admin office.</p>
                 </div>
            </div>
        </div>
    );
};

export default PaymentMethodModal;
