import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/ui/Card';
import PaymentModal from '../components/modals/PaymentModal';
import ReceiptModal from '../components/modals/ReceiptModal';
import PaymentMethodModal from '../components/modals/PaymentMethodModal';
import AdminRecordPaymentModal from '../components/modals/AdminRecordPaymentModal';
import { getDuesForUser, getAllDues, recordCashPaymentIntent } from '../services/googleSheetsApi';
import { Due, User, UserRole } from '../types';
import { CreditCard, AlertTriangle, Printer, Filter, XCircle } from 'lucide-react';
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

  // Filters
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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

  const handlePrint = () => {
    window.print();
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
            return <button onClick={() => handleViewReceiptClick(due)} className="font-medium text-brand-primary hover:underline text-xs no-print">View Receipt</button>;
        }
        if (payment?.status === 'pending') {
            return <button onClick={() => handleViewReceiptClick(due)} className="font-medium text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-md text-xs no-print">Review Payment</button>;
        }
        // For rejected, unpaid, or overdue, allow admin to record a new payment.
        return <button onClick={() => handleRecordPaymentClick(due)} className="font-medium text-white bg-brand-primary hover:bg-brand-dark px-3 py-1 rounded-md text-xs no-print">Record Payment</button>;
    }
    return null;
  }

  // Filter Logic
  const filteredDues = dues.filter(due => {
    // 1. Filter by Month/Year
    if (filterMonth) {
        const dueMonth = due.billing_month.substring(0, 7); // YYYY-MM
        if (dueMonth !== filterMonth) return false;
    }

    // 2. Filter by Status
    if (filterStatus !== 'all') {
        if (filterStatus === 'pending') {
             // Check if payment exists and is pending
             if (due.payment?.status !== 'pending') return false;
        } else if (filterStatus === 'rejected') {
             if (due.payment?.status !== 'rejected') return false;
        } else {
             // Standard statuses: paid, unpaid, overdue
             if (due.status !== filterStatus) return false;
        }
    }

    return true;
  });

  return (
    <>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-area, #printable-area * {
              visibility: visible;
            }
            #printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              z-index: 50;
            }
            
            /* Reset layout for print to ensure full height and no overflow clipping */
            html, body, #root, main, .flex, .h-screen {
                height: auto !important;
                overflow: visible !important;
                position: static !important;
                display: block !important;
                margin: 0 !important;
            }
            
            .no-print {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
            
             /* Add borders for table readability in print */
            table {
                border-collapse: collapse !important;
                width: 100% !important;
            }
            th, td {
                border: 1px solid #ddd !important;
                padding: 8px !important;
            }
            thead {
                background-color: #f3f4f6 !important; /* gray-100 */
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            /* Remove card shadows/borders for cleaner print */
            .shadow-md {
                box-shadow: none !important;
                border: none !important;
            }
          }
          .print-only {
            display: none;
          }
        `}
      </style>

      <div id="printable-area">
        {/* Print Header */}
        <div className="print-only mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Deca Homes Baywalk Phase 1</h1>
            <p className="text-lg text-gray-600 mt-1">Billing Report</p>
            <p className="text-sm text-gray-500 mt-2">Generated on: {new Date().toLocaleString()}</p>
            <div className="mt-4 border-b-2 border-gray-800"></div>
        </div>

        <Card className="print:shadow-none print:border-none">
            <div className="p-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 no-print">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <CreditCard className="mr-2 text-brand-secondary"/>
                Billing History
            </h3>
            
            {user.role === UserRole.ADMIN && (
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    {/* Filter Controls */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input 
                                type="month" 
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="pl-3 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="pl-3 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary appearance-none bg-white"
                            >
                                <option value="all">All Status</option>
                                <option value="paid">Paid</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="overdue">Overdue</option>
                                <option value="pending">Pending Verification</option>
                                <option value="rejected">Payment Rejected</option>
                            </select>
                            <Filter className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                        {(filterMonth || filterStatus !== 'all') && (
                            <button 
                                onClick={() => { setFilterMonth(''); setFilterStatus('all'); }}
                                className="text-gray-500 hover:text-red-500"
                                title="Clear Filters"
                            >
                                <XCircle size={20} />
                            </button>
                        )}
                    </div>

                    <button 
                        onClick={handlePrint}
                        className="flex items-center justify-center px-4 py-2 text-sm bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors"
                    >
                        <Printer className="mr-2 h-4 w-4" />
                        Print / Save as PDF
                    </button>
                </div>
            )}
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
                        <th scope="col" className="px-6 py-3 no-print">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && dues.length > 0 && (
                        <tr><td colSpan={user.role === UserRole.ADMIN ? 6 : 4} className="text-center p-4 text-sm text-gray-500">Refreshing data...</td></tr>
                    )}
                    {filteredDues.length === 0 && !loading && (
                         <tr><td colSpan={user.role === UserRole.ADMIN ? 6 : 4} className="text-center p-8 text-gray-500">No records found matching your filters.</td></tr>
                    )}
                    {filteredDues.map((due) => (
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
                            <td className="px-6 py-4 no-print">
                                {renderActionCell(due)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            )}
            </div>
            
            {/* Print Footer */}
            <div className="print-only mt-8 text-center text-xs text-gray-400">
                <p>End of Report - Deca Homes Baywalk Phase 1 System</p>
            </div>
        </Card>
      </div>

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