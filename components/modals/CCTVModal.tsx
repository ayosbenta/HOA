import React, { useState, useEffect } from 'react';
import { X, Video, Edit } from 'lucide-react';
import { createCCTV, updateCCTV } from '../../services/googleSheetsApi';
import { CCTV } from '../../types';

interface CCTVModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    cctvToEdit?: CCTV;
}

const CCTVModal: React.FC<CCTVModalProps> = ({ isOpen, onClose, onSuccess, cctvToEdit }) => {
    const [name, setName] = useState('');
    const [streamUrl, setStreamUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (cctvToEdit) {
                setName(cctvToEdit.name);
                setStreamUrl(cctvToEdit.stream_url);
            } else {
                setName('');
                setStreamUrl('');
            }
            setError('');
        }
    }, [isOpen, cctvToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            if (cctvToEdit) {
                await updateCCTV({ ...cctvToEdit, name, stream_url: streamUrl });
            } else {
                await createCCTV({ name, stream_url: streamUrl });
            }
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save camera.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        {cctvToEdit ? (
                             <Edit className="mr-2 text-brand-secondary" />
                        ) : (
                             <Video className="mr-2 text-brand-secondary" />
                        )}
                        {cctvToEdit ? 'Edit Camera' : 'Add New Camera'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Camera Name</label>
                            <input 
                                type="text" 
                                id="name" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                required 
                                placeholder="e.g., Main Gate, Clubhouse"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" 
                            />
                        </div>
                        <div>
                            <label htmlFor="streamUrl" className="block text-sm font-medium text-gray-700">Stream URL / IP Address</label>
                            <input 
                                type="text" 
                                id="streamUrl" 
                                value={streamUrl} 
                                onChange={(e) => setStreamUrl(e.target.value)} 
                                required 
                                placeholder="http://192.168.1.10/stream or .m3u8 link"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" 
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Enter a direct link to the video stream (MJPEG, HLS, or a standard video file URL). 
                            </p>
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                    <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary border border-transparent rounded-md hover:bg-brand-dark disabled:bg-gray-400 flex justify-center items-center min-w-[100px]">
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (cctvToEdit ? 'Save Changes' : 'Add Camera')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CCTVModal;