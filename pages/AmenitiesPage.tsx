import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/ui/Card';
import {
    getAmenityReservationsForUser,
    getAllAmenityReservations,
    createAmenityReservation,
    updateAmenityReservationStatus,
    AmenityReservationPayload,
} from '../services/googleSheetsApi';
import { AmenityReservation, User, UserRole } from '../types';
import { CalendarPlus, List, ThumbsUp, ThumbsDown } from 'lucide-react';

interface AmenitiesPageProps {
    user: User;
}

const AmenitiesPage: React.FC<AmenitiesPageProps> = ({ user }) => {
    const [reservations, setReservations] = useState<AmenityReservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const isHomeowner = user.role === UserRole.HOMEOWNER;
    const isAdmin = user.role === UserRole.ADMIN;

    const initialFormState = {
        amenityName: 'Clubhouse' as AmenityReservation['amenity_name'],
        reservationDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '11:00',
        notes: '',
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchReservations = useCallback(async () => {
        setLoading(true);
        try {
            const data = isAdmin
                ? await getAllAmenityReservations()
                : await getAmenityReservationsForUser(user.user_id);
            setReservations(data);
        } catch (error) {
            console.error("Failed to fetch amenity reservations", error);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, user.user_id]);

    useEffect(() => {
        fetchReservations();
    }, [fetchReservations]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (new Date(formData.reservationDate).getTime() < new Date().setHours(0,0,0,0)) {
            setFormError('Cannot book a date in the past.');
            return;
        }
        if (formData.startTime >= formData.endTime) {
            setFormError('Start time must be before end time.');
            return;
        }
        setFormError('');
        setIsSubmitting(true);
        try {
            const payload: AmenityReservationPayload = {
                userId: user.user_id,
                ...formData
            };
            const newReservation = await createAmenityReservation(payload);
            setReservations(prev => [newReservation, ...prev]);
            setFormData(initialFormState);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleStatusUpdate = async (reservationId: string, status: AmenityReservation['status']) => {
        // Optimistic update
        const originalReservations = [...reservations];
        setReservations(prev => prev.map(r => r.reservation_id === reservationId ? { ...r, status } : r));

        try {
            await updateAmenityReservationStatus(reservationId, status);
        } catch (error) {
            console.error("Failed to update status", error);
            // Revert on failure
            setReservations(originalReservations);
            alert("Failed to update reservation status.");
        }
    }

    const getStatusChip = (status: AmenityReservation['status']) => {
        const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
        switch (status) {
            case 'approved': return <span className={`${baseClasses} bg-green-100 text-green-800`}>Approved</span>;
            case 'pending': return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Pending</span>;
            case 'denied': return <span className={`${baseClasses} bg-red-100 text-red-800`}>Denied</span>;
            case 'completed': return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Completed</span>;
            default: return null;
        }
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {isHomeowner && (
                 <Card className="p-6 lg:col-span-1 h-fit">
                     <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                         <CalendarPlus className="mr-2 text-brand-secondary" />
                         Book an Amenity
                     </h3>
                     <form className="space-y-4" onSubmit={handleCreateReservation}>
                         <div>
                            <label htmlFor="amenityName" className="block text-sm font-medium text-gray-700">Amenity</label>
                            <select id="amenityName" name="amenityName" value={formData.amenityName} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary">
                                <option>Clubhouse</option>
                                <option>Basketball Court</option>
                                <option>Swimming Pool</option>
                            </select>
                         </div>
                         <div>
                            <label htmlFor="reservationDate" className="block text-sm font-medium text-gray-700">Date</label>
                            <input type="date" id="reservationDate" name="reservationDate" value={formData.reservationDate} onChange={handleFormChange} min={new Date().toISOString().split('T')[0]} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" required />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                                <input type="time" id="startTime" name="startTime" value={formData.startTime} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" required />
                             </div>
                             <div>
                                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time</label>
                                <input type="time" id="endTime" name="endTime" value={formData.endTime} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" required />
                             </div>
                         </div>
                         <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (optional)</label>
                            <textarea id="notes" name="notes" value={formData.notes} onChange={handleFormChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" placeholder="e.g., Birthday party for 20 guests"></textarea>
                         </div>
                         {formError && <p className="text-sm text-red-600">{formError}</p>}
                         <button type="submit" disabled={isSubmitting} className="w-full py-2 px-4 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:bg-gray-400 flex justify-center items-center">
                              {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Submit Request'}
                         </button>
                     </form>
                 </Card>
            )}

            <div className={isHomeowner ? "lg:col-span-2" : "lg:col-span-3"}>
                <Card>
                    <div className="p-5 border-b">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                            <List className="mr-2 text-brand-secondary" />
                            {isHomeowner ? 'My Reservations' : 'Amenity Reservation Log'}
                        </h3>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                             <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    {isAdmin && <th scope="col" className="px-6 py-3">Homeowner</th>}
                                    <th scope="col" className="px-6 py-3">Amenity</th>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3">Time</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={isAdmin ? 6 : 5} className="text-center p-8">Loading reservations...</td></tr>
                                ) : reservations.length === 0 ? (
                                     <tr><td colSpan={isAdmin ? 6 : 5} className="text-center p-8 text-gray-500">No reservations found.</td></tr>
                                ) : (
                                    reservations.map((r) => (
                                        <tr key={r.reservation_id} className="bg-white border-b hover:bg-gray-50">
                                            {isAdmin && <td className="px-6 py-4 font-medium text-gray-900">{r.full_name}</td>}
                                            <td className="px-6 py-4 font-medium text-gray-900">{r.amenity_name}</td>
                                            <td className="px-6 py-4">{new Date(r.reservation_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">{r.start_time} - {r.end_time}</td>
                                            <td className="px-6 py-4">{getStatusChip(r.status)}</td>
                                            <td className="px-6 py-4">
                                                {isAdmin && r.status === 'pending' ? (
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => handleStatusUpdate(r.reservation_id, 'approved')} className="p-1.5 text-green-600 bg-green-100 rounded-full hover:bg-green-200"><ThumbsUp size={16}/></button>
                                                        <button onClick={() => handleStatusUpdate(r.reservation_id, 'denied')} className="p-1.5 text-red-600 bg-red-100 rounded-full hover:bg-red-200"><ThumbsDown size={16}/></button>
                                                    </div>
                                                ) : <span className="text-gray-400 text-xs">No actions</span>}
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

export default AmenitiesPage;