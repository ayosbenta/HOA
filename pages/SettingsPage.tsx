import React, { useState, useRef } from 'react';
import Card from '../components/ui/Card';
import { Upload, Trash2, Banknote, Users, Bell, DollarSign, Edit } from 'lucide-react';

const SettingsPage: React.FC = () => {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setQrCode(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };
    
    const removeQrCode = () => {
        setQrCode(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <div className="p-5 border-b">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <Banknote className="mr-2 text-brand-secondary" />
                        Payment Methods
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <h4 className="font-semibold text-gray-700">Cash Payments</h4>
                        <p className="text-sm text-gray-500 mt-1">Cash payments are accepted at the HOA admin office during office hours.</p>
                    </div>
                    <hr />
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">G-Cash Payments</h4>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            <div className="w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                                {qrCode ? (
                                    <img src={qrCode} alt="G-Cash QR Code" className="w-full h-full object-contain rounded-lg" />
                                ) : (
                                    <span className="text-gray-400 text-sm text-center">QR Code Preview</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-500 mb-4">Upload a QR code for residents to scan for G-Cash payments. This will be displayed on their billing statements.</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/png, image/jpeg"
                                />
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleUploadClick}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark focus:outline-none"
                                    >
                                        <Upload className="mr-2 -ml-1 h-5 w-5" />
                                        {qrCode ? 'Change QR' : 'Upload QR'}
                                    </button>
                                    {qrCode && (
                                         <button
                                            onClick={removeQrCode}
                                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                        >
                                            <Trash2 className="mr-2 -ml-1 h-5 w-5 text-red-500" />
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="p-5 border-b">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <Users className="mr-2 text-brand-secondary" />
                        User Roles & Permissions
                    </h3>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-500">Manage what different user roles can see and do within the app. (Feature coming soon)</p>
                     <button className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-200 cursor-not-allowed">
                        Manage Roles
                    </button>
                </div>
            </Card>
            
            <Card>
                <div className="p-5 border-b">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <DollarSign className="mr-2 text-brand-secondary" />
                        HOA Fee Schedule
                    </h3>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-500">Set the monthly association dues and configure penalties for late payments. (Feature coming soon)</p>
                     <button className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-200 cursor-not-allowed">
                        Configure Fees
                    </button>
                </div>
            </Card>

        </div>
    );
};

export default SettingsPage;