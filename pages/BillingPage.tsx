import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import PaymentModal from '../components/modals/PaymentModal'; // Import the modal
import { getDuesForUser, getAllDues } from '../services/googleSheetsApi';
import { Due, User, UserRole } from '../types';
import { CreditCard } from 'lucide-react';

interface BillingPageProps {
  user: User;
}

const BillingPage: React.FC<BillingPageProps> = ({ user }) => {
  const [dues, setDues] = useState<Due[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<Due | null>(null);

  useEffect(() => {
    const fetchDues = async () => {
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
    };
    fetchDues();
  }, [user]);

  const handlePayNowClick = (due: Due) => {
    setSelectedDue(due);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDue(null);
  };

  const handlePaymentSubmit = (proof: File) => {
    // In a real app, you would upload the file and update the payment status.
    // For this demo, we'll just log it and show an alert.
    console.log('Submitting payment proof:', proof.name, 'for due:', selectedDue?.due_id);
    alert(`Payment proof for ${selectedDue?.billing_month} submitted! It will be reviewed by the admin.`);
    
    // Optimistically update the UI
    if (selectedDue) {
        setDues(dues.map(d => d.due_id === selectedDue.due_id ? { ...d, status: 'paid' } : d)); // This is a mock update, a real app would refetch
    }

    handleCloseModal();
  };

  const getStatusChip = (status: 'paid' | 'unpaid' | 'overdue') => {
    switch (status) {
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

  const isHomeowner = user.role === UserRole.HOMEOWNER;

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
          {loading ? (
              <div className="text-center p-8">Loading billing information...</div>
          ) : (
              <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                      <th scope="col" className="px-6 py-3">Billing Month</th>
                      {user.role === UserRole.ADMIN && <th scope="col" className="px-6 py-3">Homeowner</th>}
                      <th scope="col" className="px-6 py-3">Amount</th>
                      <th scope="col" className="px-6 py-3">Penalty</th>
                      <th scope="col" className="px-6 py-3">Total Due</th>
                      <th scope="col" className="px-6 py-3">Status</th>
                      <th scope="col" className="px-6 py-3">Action</th>
                  </tr>
              </thead>
              <tbody>
                  {dues.map((due) => (
                      <tr key={due.due_id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{due.billing_month}</td>
                          {user.role === UserRole.ADMIN && <td className="px-6 py-4">User {due.user_id.slice(0,5)}</td>}
                          <td className="px-6 py-4">₱{due.amount.toFixed(2)}</td>
                          <td className="px-6 py-4">₱{due.penalty.toFixed(2)}</td>
                          <td className="px-6 py-4 font-bold">₱{due.total_due.toFixed(2)}</td>
                          <td className="px-6 py-4">{getStatusChip(due.status)}</td>
                          <td className="px-6 py-4">
                              {(due.status === 'unpaid' || due.status === 'overdue') && isHomeowner ? (
                                  <button onClick={() => handlePayNowClick(due)} className="font-medium text-white bg-brand-primary hover:bg-brand-dark px-3 py-1 rounded-md text-xs">
                                      Pay Now
                                  </button>
                              ) : (
                                  <button className="font-medium text-gray-400 cursor-not-allowed text-xs">
                                      View Receipt
                                  </button>
                              )}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
          )}
        </div>
      </Card>
      <PaymentModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        due={selectedDue}
        onSubmit={handlePaymentSubmit}
      />
    </>
  );
};

export default BillingPage;