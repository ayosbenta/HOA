import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { getVisitorsForHomeowner, getAllVisitors, createVisitorPass } from '../services/googleSheetsApi';
import { Visitor, User, UserRole } from '../types';
import { QrCode, ShieldCheck, UserPlus } from 'lucide-react';

interface VisitorsPageProps {
    user: User;
}

const VisitorsPage: React.FC<VisitorsPageProps> = ({ user }) => {
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [guestName, setGuestName] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        const fetchVisitors = async () => {
            setLoading(true);
            try {
                const data = user.role === UserRole.HOMEOWNER 
                    ? await getVisitorsForHomeowner(user.user_id) 
                    : await getAllVisitors();
                setVisitors(data);
            } catch (error) {
                console.error("Failed to fetch visitors", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVisitors();
    }, [user]);

    const handleCreatePass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestName.trim()) {
            setFormError('Guest name is required.');
            return;
        }
        setFormError('');
        setIsSubmitting(true);
        try {
            const newVisitor = await createVisitorPass({
                homeownerId: user.user_id,
                name: guestName,
                vehicle: plateNumber,
                date: visitDate,
            });
            setVisitors(prev => [newVisitor, ...prev]);
            setGuestName('');
            setPlateNumber('');
            setVisitDate(new Date().toISOString().split('T')[0]);
        } catch (error) {
            console.error("Failed to create visitor pass", error);
            if (error instanceof Error) {
                setFormError(error.message);
            } else {
                setFormError("An unknown error occurred.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const isHomeowner = user.role === UserRole.HOMEOWNER;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {isHomeowner && (
                <Card className="p-6 lg:col-span-1 h-fit">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <UserPlus className="mr-2 text-brand-secondary" />
                        Create Visitor Pass
                    </h3>
                    <form className="space-y-4" onSubmit={handleCreatePass}>
                        <div>
                            <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">Guest Name</label>
                            <input 
                                type="text" 
                                id="guestName" 
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" 
                                required 
                            />
                        </div>
                        <div>
                            <label htmlFor="plateNumber" className="block text-sm font-medium text-gray-700">Vehicle Plate No. (optional)</label>
                            <input 
                                type="text" 
                                id="plateNumber" 
                                value={plateNumber}
                                onChange={(e) => setPlateNumber(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" 
                            />
                        </div>
                        <div>
                            <label htmlFor="visitDate" className="block text-sm font-medium text-gray-700">Date of Visit</label>
                            <input 
                                type="date" 
                                id="visitDate" 
                                value={visitDate}
                                onChange={(e) => setVisitDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" 
                                required
                            />
                        </div>
                        {formError && <p className="text-sm text-red-600">{formError}</p>}
                        <button type="submit" disabled={isSubmitting} className="w-full py-2 px-4 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:bg-gray-400 flex justify-center items-center">
                             {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                'Generate Pass'
                            )}
                        </button>
                    </form>
                </Card>
            )}

            <div className={isHomeowner ? "lg:col-span-2" : "lg:col-span-3"}>
                <Card>
                    <div className="p-5 border-b">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                            <ShieldCheck className="mr-2 text-brand-secondary" />
                            {isHomeowner ? 'My Visitor Passes' : 'Visitor Log'}
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Visitor Name</th>
                                    {!isHomeowner && <th scope="col" className="px-6 py-3">Homeowner</th>}
                                    <th scope="col" className="px-6 py-3">Vehicle</th>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3">QR Code</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center p-8">Loading visitor data...</td></tr>
                                ) : (
                                    visitors.map((visitor) => (
                                        <tr key={visitor.visitor_id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{visitor.name}</td>
                                            {!isHomeowner && <td className="px-6 py-4">B{Math.floor(Math.random()*10)} L{Math.floor(Math.random()*20)}</td>}
                                            <td className="px-6 py-4">{visitor.vehicle || 'N/A'}</td>
                                            <td className="px-6 py-4">{visitor.date}</td>
                                            <td className="px-6 py-4 capitalize">{visitor.status}</td>
                                            <td className="px-6 py-4">
                                                <button className="text-brand-primary hover:text-brand-dark">
                                                    <QrCode size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default VisitorsPage;