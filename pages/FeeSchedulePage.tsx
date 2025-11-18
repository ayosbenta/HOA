import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { getAppSettings, updateAppSettings } from '../services/googleSheetsApi';
import { DollarSign, CheckCircle, CalendarDays } from 'lucide-react';

const FeeSchedulePage: React.FC = () => {
    const [monthlyDue, setMonthlyDue] = useState<number>(0);
    const [penalty, setPenalty] = useState<number>(0);
    const [effectiveDate, setEffectiveDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const fetchFees = async () => {
            setLoading(true);
            try {
                const schedule = await getAppSettings();
                setMonthlyDue(schedule.monthlyDue);
                setPenalty(schedule.penalty);
                setEffectiveDate(schedule.effectiveDate || new Date().toISOString().split('T')[0]);
            } catch (error) {
                console.error("Failed to fetch fee schedule", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFees();
    }, []);
    
    const handleSaveChanges = async () => {
        setSaving(true);
        try {
            await updateAppSettings({ monthlyDue, penalty, effectiveDate });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) {
            console.error("Failed to update fee schedule", error);
            alert("Error: Could not save fee schedule.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-center p-8">Loading fee schedule...</div>;
    }

    return (
        <Card>
            <div className="p-5 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <DollarSign className="mr-2 text-brand-secondary" />
                    HOA Fee Schedule
                </h3>
                {showSuccess && (
                     <div className="flex items-center text-green-600 transition-opacity duration-300">
                           <CheckCircle size={20} className="mr-2"/>
                           <span>Saved!</span>
                        </div>
                )}
            </div>
            <div className="p-6 space-y-6">
                <div>
                    <label htmlFor="effectiveDate" className="block text-sm font-medium text-gray-700">
                        Schedule Effective Date
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <CalendarDays className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="date"
                            name="effectiveDate"
                            id="effectiveDate"
                            className="block w-full rounded-md border-gray-300 pl-10 focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                            value={effectiveDate}
                            onChange={(e) => setEffectiveDate(e.target.value)}
                        />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">The new fee schedule will apply starting from this date.</p>
                </div>

                <div>
                    <label htmlFor="monthlyDue" className="block text-sm font-medium text-gray-700">
                        Monthly Association Dues (PHP)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-500 sm:text-sm">₱</span>
                        </div>
                        <input
                            type="number"
                            name="monthlyDue"
                            id="monthlyDue"
                            className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                            placeholder="0.00"
                            value={monthlyDue}
                            onChange={(e) => setMonthlyDue(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="penalty" className="block text-sm font-medium text-gray-700">
                        Late Payment Penalty (PHP)
                    </label>
                     <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-500 sm:text-sm">₱</span>
                        </div>
                        <input
                            type="number"
                            name="penalty"
                            id="penalty"
                            className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                            placeholder="0.00"
                            value={penalty}
                            onChange={(e) => setPenalty(Number(e.target.value))}
                        />
                    </div>
                     <p className="mt-2 text-xs text-gray-500">This amount will be added to the total due if payment is not made by the deadline.</p>
                </div>
                 <div className="flex justify-end">
                    <button
                        onClick={handleSaveChanges}
                        disabled={saving}
                        className="w-32 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:bg-gray-400"
                    >
                         {saving ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </Card>
    );
};

export default FeeSchedulePage;