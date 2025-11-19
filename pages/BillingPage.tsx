import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/ui/Card';
import PaymentModal from '../components/modals/PaymentModal';
import ReceiptModal from '../components/modals/ReceiptModal';
import PaymentMethodModal from '../components/modals/PaymentMethodModal';
import AdminRecordPaymentModal from '../components/modals/AdminRecordPaymentModal';
import { getDuesForUser, getAllDues, recordCashPaymentIntent } from '../services/googleSheetsApi';
import { Due, User, UserRole } from '../types';
import { CreditCard, AlertTriangle } from 'lucide-react';
import Tooltip from '../components/ui/Tooltip';

interface BillingPageProps {
  user: User;
}

const BillingPage: React.FC<BillingPageProps> = ({ user }) => {
  const [dues, setDues] = useState<Due[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [isAdminRecordPaymentModalOpen, setIsAdminRecordPaymentModalOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<Due | null>(null);
  const [isSubmittingCash, setIsSubmittingCash] = useState(false);

  const fetchDues = useCallback(async () => {
    setLoading(true);
    try {
      const data = user.role === UserRole.ADMIN 
        ? await getAllDues()
        : await getDuesForUser(user.user_id);
      setDues(data);
    } catch (error) {
      console.error('Failed to fetch dues', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDues();
  }, [fetchDues]);

  const handlePayNowClick = (due: Due) => {
    setSelectedDue(due);
    setIsMethodModalOpen(true);
  };

  const handleViewReceiptClick = (due: Due) => {
    setSelectedDue(due);
    setIsReceiptModalOpen(true);
  };
  
  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    setSelectedDue(null);
    fetchDues();
  };

  const handleAdminPaymentSuccess = () => {
    setIsAdminRecordPaymentModalOpen(false);
    setSelectedDue(null);
    fetchDues();
  };

  const handleModalUpdate = () => {
    setIsReceiptModalOpen(false);
    setSelectedDue(null);
    fetchDues();
  };

  const handleSelectGcash = () => {
    setIsMethodModalOpen(false);
    setIsPaymentModalOpen(true);
  };

  const handleSelectCash = async () => {
     if (!selectedDue) return;

    const confirmed = window.confirm(
      'You have selected to pay in cash. Please proceed to the HOA admin office during office hours to complete your payment.\n\nYour payment will be marked as "Pending" until an admin verifies receipt of your payment.'
    );

    if (confirmed) {
      setIsSubmittingCash(true);
      try {
        await recordCashPaymentIntent(selectedDue.due_id);
        setIsMethodModalOpen(false);
        setSelectedDue(null);
        fetchDues();
      } catch (error) {
        console.error("Failed to record cash payment intent:", error);
        alert(`Error: ${error instanceof Error ? error.message : 'Could not proceed with cash payment.'}`);
      } finally {
        setIsSubmittingCash(false);
      }
    }
  };

  const handleRecordPaymentClick = (due: Due) => {
    setSelectedDue(due);
    setIsAdminRecordPaymentModalOpen(true);
  };


  const getStatusChip = (due: Due) => {
    if (due.payment?.status === 'pending') {
        const text = due.payment.method === 'Cash' ? 'Pending Cash Payment' : 'Pending Verification';
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{text}</span>;
    }
     if (due.payment?.status === 'rejected') {
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">Payment Rejected</span>;
    }
    switch (due.status) {
      case 'paid':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Paid</span>;
      case 'unpaid':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Unpaid</span>;
      case 'overdue':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Overdue</span>;
      default:
        return null;
    }
  };

  const renderActionCell = (due: Due) => {
    const isHomeowner = user.role === UserRole.HOMEOWNER;
    const isAdmin = user.role === UserRole.ADMIN;
    const { payment } = due;

    // Homeowner's View
    if (isHomeowner) {
        if (due.status === 'paid') {
            return <button onClick={() => handleViewReceiptClick(due)} className="font-medium text-brand-primary hover:underline text-xs">View Receipt</button>;
        }
        if (payment?.status === 'pending') {
            const text = payment.method === 'Cash' ? 'Pending Cash Payment' : 'Payment Pending';
            return <button disabled className="font-medium text-gray-400 cursor-not-allowed px-3 py-1 rounded-md text-xs">{text}</button>;
        }
        if (payment?.status === 'rejected') {
            return (
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePayNowClick(due)} className="font-medium text-white bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded-md text-xs">Resubmit</button>
                    <Tooltip text={`Reason: ${payment.notes || 'No reason provided.'}`}>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </Tooltip>
                </div>
            )
        }
        return <button onClick={() => handlePayNowClick(due)} className="font-medium text-white bg-brand-primary hover:bg-brand-dark px-3 py-1 rounded-md text-xs">Pay Now</button>;
    }

    // Admin's View
    if (isAdmin) {
        if (payment?.status === 'verified' || due.status === 'paid') {
            return <button onClick={() => handleViewReceiptClick(due)} className="font-medium text-brand-primary hover:underline text-xs">View Receipt</button>;
        }
        if (payment?.status === 'pending') {
            return <button onClick={() => handleViewReceiptClick(due)} className="font-medium text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-md text-xs">Review Payment</button>;
        }
        // For rejected, unpaid, or overdue, allow admin to record a new payment.
        return <button onClick={() => handleRecordPaymentClick(due)} className="font-medium text-white bg-brand-primary hover:bg-brand-dark px-3 py-1 rounded-md text-xs">Record Payment</button>;
    }
    return null;
  }

  return (
    <>
      <Card>
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <CreditCard className="mr-2 text-brand-secondary"/>
              Billing History
          </h3>
          {user.role === UserRole.ADMIN && <button className="px-4 py-2 text-sm bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors">Export as PDF</button>}
        </div>
        <div className="overflow-x-auto">
          {loading && dues.length === 0 ? (
              <div className="text-center p-8">Loading billing information...</div>
          ) : (
              <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                      <th scope="col" className="px-6 py-3">Billing Date</th>
                      {user.role === UserRole.ADMIN && (
                        <>
                            <th scope="col" className="px-6 py-3">Homeowner</th>
                            <th scope="col" className="px-6 py-3">Unit</th>
                        </>
                      )}
                      <th scope="col" className="px-6 py-3">Total Due</th>
                      <th scope="col" className="px-6 py-3">Status</th>
                      <th scope="col" className="px-6 py-3">Action</th>
                  </tr>
              </thead>
              <tbody>
                  {loading && dues.length > 0 && (
                      <tr><td colSpan={user.role === UserRole.ADMIN ? 6 : 4} className="text-center p-4 text-sm text-gray-500">Refreshing data...</td></tr>
                  )}
                  {dues.map((due) => (
                      <tr key={due.due_id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {new Date(due.billing_month).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                timeZone: 'UTC'
                            })}
                          </td>
                          {user.role === UserRole.ADMIN && (
                            <>
                                <td className="px-6 py-4">{due.full_name}</td>
                                <td className="px-6 py-4">{`B${due.block} L${due.lot}`}</td>
                            </>
                          )}
                          <td className="px-6 py-4 font-bold">₱{due.total_due.toFixed(2)}</td>
                          <td className="px-6 py-4">{getStatusChip(due)}</td>
                          <td className="px-6 py-4">
                            {renderActionCell(due)}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
          )}
        </div>
      </Card>

      <PaymentMethodModal
        isOpen={isMethodModalOpen}
        onClose={() => setIsMethodModalOpen(false)}
        due={selectedDue}
        onSelectGcash={handleSelectGcash}
        onSelectCash={handleSelectCash}
        isSubmittingCash={isSubmittingCash}
      />

      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        due={selectedDue}
        onSuccess={handlePaymentSuccess}
      />
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        due={selectedDue}
        user={user}
        onUpdate={handleModalUpdate}
      />
      <AdminRecordPaymentModal
        isOpen={isAdminRecordPaymentModalOpen}
        onClose={() => setIsAdminRecordPaymentModalOpen(false)}
        due={selectedDue}
        onSuccess={handleAdminPaymentSuccess}
      />
    </>
  );
};

export default BillingPage;