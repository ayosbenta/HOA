import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { getAnnouncements } from '../services/googleSheetsApi';
import { Announcement, UserRole } from '../types';
import { Megaphone, PlusCircle } from 'lucide-react';
import CreateAnnouncementModal from '../components/modals/CreateAnnouncementModal';
import { useAuth } from '../contexts/AuthContext';

const AnnouncementsPage: React.FC = () => {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const data = await getAnnouncements();
            setAnnouncements(data);
        } catch (error) {
            console.error("Failed to fetch announcements", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const isAdmin = user?.role === UserRole.ADMIN;

    return (
        <>
            <div className="space-y-6">
                {isAdmin && (
                    <div className="flex justify-end">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark focus:outline-none"
                        >
                            <PlusCircle className="mr-2 -ml-1 h-5 w-5" />
                            Create Announcement
                        </button>
                    </div>
                )}

                {loading ? (
                     <div className="flex justify-center items-center h-64">
                        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : announcements.length === 0 ? (
                    <Card className="text-center p-12 text-gray-500">
                        No announcements have been posted yet.
                    </Card>
                ) : (
                    announcements.map((ann) => (
                        <Card key={ann.ann_id} className="flex flex-col md:flex-row">
                            {ann.image_url && (
                                <div className="md:w-1/3">
                                    <img src={ann.image_url} alt={ann.title} className="object-cover h-48 w-full md:h-full rounded-t-xl md:rounded-l-xl md:rounded-r-none"/>
                                </div>
                            )}
                            <div className="p-6 flex-1">
                                <div className="flex items-center mb-2">
                                    <div className="p-2 bg-brand-light rounded-full mr-3">
                                        <Megaphone className="text-brand-primary" size={20}/>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">{ann.title}</h3>
                                </div>
                                <p className="text-gray-600 mt-2 whitespace-pre-wrap">{ann.content}</p>
                                <div className="mt-4 text-sm text-gray-500">
                                    <span>Posted on {new Date(ann.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    <span className="mx-2">|</span>
                                    <span>By {ann.created_by}</span>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
            {isAdmin && (
                <CreateAnnouncementModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchAnnouncements}
                />
            )}
        </>
    );
};

export default AnnouncementsPage;