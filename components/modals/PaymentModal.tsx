import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, FileText } from 'lucide-react';
import { getAppSettings, submitPayment } from '../../services/googleSheetsApi';
import { Due } from '../../types';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    due: Due | null;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess, due }) => {
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [loadingQr, setLoadingQr] = useState(true);
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const fetchQrCode = async () => {
                setLoadingQr(true);
                try {
                    const settings = await getAppSettings();
                    setQrCodeUrl(settings.gcashQrCode);
                } catch (error) {
                    console.error("Failed to fetch QR code", error);
                    setQrCodeUrl(null);
                } finally {
                    setLoadingQr(false);
                }
            };

            fetchQrCode();
            // Reset state on open
            setPaymentProof(null);
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen || !due) return null;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('File size cannot exceed 5MB.');
                return;
            }
            setError('');
            setPaymentProof(file);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentProof) {
            setError('Please upload proof of payment.');
            return;
        }
        if (!due) {
            setError('Associated due not found.');
            return;
        }

        setError('');
        setIsSubmitting(true);
        try {
            const proofUrl = await fileToBase64(paymentProof);
            await submitPayment({
                dueId: due.due_id,
                userId: due.user_id,
                amount: due.total_due,
                method: 'GCash',
                proofUrl: proofUrl,
            });
            onSuccess(); // Triggers refetch on parent page
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Payment for {due.billing_month}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div className="text-center">
                            <p className="text-sm text-gray-500">Total Amount Due:</p>
                            <p className="text-4xl font-bold text-brand-dark">₱{due.total_due.toFixed(2)}</p>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-700 mb-2">Instructions:</h4>
                            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                                <li>Scan the G-Cash QR code below to pay.</li>
                                <li>Take a screenshot of your successful transaction.</li>
                                <li>Upload the screenshot as proof of payment.</li>
                            </ol>
                        </div>
                        
                        <div className="flex justify-center items-center h-56">
                            {loadingQr ? (
                                <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                            ) : qrCodeUrl ? (
                                <img src={qrCodeUrl} alt="G-Cash QR Code" className="w-56 h-56 object-contain rounded-lg border" />
                            ) : (
                                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                                    G-Cash QR code is not available. Please contact the admin office for payment instructions.
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Proof of Payment</label>
                            <div 
                                onClick={handleUploadClick}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files?.[0];
                                    if(file) setPaymentProof(file)
                                }}
                                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-brand-primary">
                                <div className="space-y-1 text-center">
                                    {paymentProof ? (
                                        <>
                                            <FileText className="mx-auto h-12 w-12 text-green-500" />
                                            <p className="font-semibold text-gray-700">{paymentProof.name}</p>
                                            <p className="text-xs text-gray-500">Click or drag to replace file</p>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium text-brand-primary">Click to upload</span> or drag and drop
                                            </p>
                                            <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                                        </>
                                    )}
                                </div>
                            </div>
                             <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/png, image/jpeg"
                            />
                            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                        </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={!qrCodeUrl || isSubmitting} className="w-36 px-4 py-2 text-sm font-medium text-white bg-brand-primary border border-transparent rounded-md hover:bg-brand-dark disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center">
                           {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                'Submit Payment'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentModal;