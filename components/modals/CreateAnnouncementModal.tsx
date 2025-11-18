import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createAnnouncement } from '../../services/googleSheetsApi';
import { AnnouncementPayload, UserRole } from '../../types';
import { X, Megaphone } from 'lucide-react';

interface CreateAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const initialState: AnnouncementPayload = {
        title: '',
        content: '',
        image_url: '',
        created_by: user?.full_name || 'Admin',
        audience: 'all',
    };
    const [formData, setFormData] = useState<AnnouncementPayload>(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await createAnnouncement(formData);
            onSuccess();
            onClose();
            setFormData(initialState);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create announcement.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <Megaphone className="mr-2 text-brand-secondary" />
                        New Announcement
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                            <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" />
                        </div>
                        <div>
                            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
                            <textarea name="content" id="content" value={formData.content} onChange={handleChange} required rows={5} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"></textarea>
                        </div>
                        <div>
                            <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">Image URL (Optional)</label>
                            <input type="url" name="image_url" id="image_url" value={formData.image_url} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" placeholder="https://example.com/image.jpg" />
                        </div>
                         <div>
                            <label htmlFor="audience" className="block text-sm font-medium text-gray-700">Audience</label>
                            <select name="audience" id="audience" value={String(formData.audience)} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary">
                                <option value="all">All Members</option>
                                <option value={UserRole.HOMEOWNER}>Homeowners Only</option>
                                <option value={UserRole.STAFF}>Staff Only</option>
                            </select>
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                    <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary border border-transparent rounded-md hover:bg-brand-dark disabled:bg-gray-400 flex justify-center items-center w-28">
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Publish'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateAnnouncementModal;