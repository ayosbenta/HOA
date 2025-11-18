import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { getAnnouncements } from '../services/mockApi';
import { Announcement } from '../types';
import { Megaphone } from 'lucide-react';

const AnnouncementsPage: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const data = await getAnnouncements();
                setAnnouncements(data);
            } catch (error) {
                console.error("Failed to fetch announcements", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnnouncements();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {announcements.map((ann) => (
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
                        <p className="text-gray-600 mt-2">{ann.content}</p>
                        <div className="mt-4 text-sm text-gray-500">
                            <span>Posted on {new Date(ann.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span className="mx-2">|</span>
                            <span>By {ann.created_by}</span>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
};

export default AnnouncementsPage;
