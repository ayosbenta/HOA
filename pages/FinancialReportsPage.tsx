
import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { getFinancialData } from '../services/googleSheetsApi';
import { FinancialReportData } from '../types';
import { 
    PieChart, Wallet, ArrowUpRight, ArrowDownLeft, 
    FileText, Plus, AlertTriangle, Building, Landmark 
} from 'lucide-react';
import AddExpenseModal from '../components/modals/AddExpenseModal';

const FinancialReportsPage: React.FC = () => {
    const [data, setData] = useState<FinancialReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

    const fetchFinancials = async () => {
        setLoading(true);
        try {
            const result = await getFinancialData();
            setData(result);
        } catch (error) {
            console.error("Failed to load financial reports", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinancials();
    }, []);

    if (loading) {
        return <div className="text-center p-8">Loading financial data...</div>;
    }

    if (!data) {
        return <div className="text-center p-8 text-red-500">Failed to load data.</div>;
    }

    const tabs = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'income', label: 'Income Report' },
        { id: 'expenses', label: 'Expense Report' },
        { id: 'cash-position', label: 'Cash Position' },
        { id: 'receivables', label: 'Accounts Receivable' },
        { id: 'ledger', label: 'Disbursement Ledger' },
    ];

    const formatCurrency = (amount: number) => {
        return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <PieChart className="mr-3 text-brand-secondary" />
                    Financial Reports
                </h2>
                
                {activeTab === 'expenses' && (
                     <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="mt-2 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark focus:outline-none"
                    >
                        <Plus className="mr-2 -ml-1 h-5 w-5" />
                        Record Expense
                    </button>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* TAB CONTENT */}

            {/* 1. DASHBOARD */}
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="p-5 border-l-4 border-green-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-800">{formatCurrency(data.totalRevenue)}</p>
                            </div>
                            <div className="p-2 bg-green-100 rounded-lg">
                                <ArrowUpRight className="text-green-600" size={24} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5 border-l-4 border-red-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500">Total Expenses</p>
                                <p className="text-2xl font-bold text-gray-800">{formatCurrency(data.totalExpenses)}</p>
                            </div>
                            <div className="p-2 bg-red-100 rounded-lg">
                                <ArrowDownLeft className="text-red-600" size={24} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5 border-l-4 border-blue-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500">Net Surplus / (Deficit)</p>
                                <p className={`text-2xl font-bold ${data.netSurplus >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {formatCurrency(data.netSurplus)}
                                </p>
                            </div>
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Wallet className="text-blue-600" size={24} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5 border-l-4 border-purple-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500">Ending Cash Balance</p>
                                <p className="text-2xl font-bold text-gray-800">{formatCurrency(data.endingCashBalance)}</p>
                            </div>
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Landmark className="text-purple-600" size={24} />
                            </div>
                        </div>
                    </Card>
                    
                    <Card className="lg:col-span-2 p-5">
                         <h3 className="text-lg font-semibold text-gray-800 mb-4">Reserve Fund Status</h3>
                         <div className="flex items-center">
                            <div className="p-3 bg-indigo-100 rounded-full mr-4">
                                <Building className="text-indigo-600" size={24}/>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Reserve Fund Contributions</p>
                                <p className="text-2xl font-bold text-indigo-700">{formatCurrency(data.reserveFundTotal)}</p>
                                <p className="text-xs text-gray-400 mt-1">Accumulated for long-term repairs.</p>
                            </div>
                         </div>
                    </Card>
                </div>
            )}

            {/* 2. INCOME REPORT */}
            {activeTab === 'income' && (
                <Card>
                    <div className="p-5 border-b">
                        <h3 className="text-lg font-semibold text-gray-800">Revenue Statement</h3>
                    </div>
                    <div className="p-6">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Revenue Source</th>
                                    <th className="px-6 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-white border-b">
                                    <td className="px-6 py-4 font-medium text-gray-900">HOA Monthly Dues</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(data.incomeBreakdown.dues)}</td>
                                </tr>
                                <tr className="bg-white border-b">
                                    <td className="px-6 py-4 font-medium text-gray-900">Penalties / Interest</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(data.incomeBreakdown.penalties)}</td>
                                </tr>
                                <tr className="bg-white border-b">
                                    <td className="px-6 py-4 font-medium text-gray-900">Other Income (Gate Pass, Rentals, etc.)</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(data.incomeBreakdown.other)}</td>
                                </tr>
                                <tr className="bg-gray-100 font-bold">
                                    <td className="px-6 py-4 text-gray-900">TOTAL REVENUE</td>
                                    <td className="px-6 py-4 text-right text-green-700">{formatCurrency(data.totalRevenue)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* 3. EXPENSE REPORT */}
            {activeTab === 'expenses' && (
                <Card>
                    <div className="p-5 border-b">
                        <h3 className="text-lg font-semibold text-gray-800">Expense Report (Disbursement Summary)</h3>
                    </div>
                    <div className="p-6">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Expense Category</th>
                                    <th className="px-6 py-3 text-right">Amount</th>
                                    <th className="px-6 py-3 text-right">% of Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(data.expenseBreakdown).map(([category, amount]) => (
                                    <tr key={category} className="bg-white border-b">
                                        <td className="px-6 py-4 font-medium text-gray-900">{category}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(amount)}</td>
                                        <td className="px-6 py-4 text-right">
                                            {data.totalExpenses > 0 ? ((amount / data.totalExpenses) * 100).toFixed(1) : 0}%
                                        </td>
                                    </tr>
                                ))}
                                {Object.keys(data.expenseBreakdown).length === 0 && (
                                    <tr><td colSpan={3} className="text-center p-4">No expenses recorded yet.</td></tr>
                                )}
                                <tr className="bg-gray-100 font-bold">
                                    <td className="px-6 py-4 text-gray-900">TOTAL EXPENSES</td>
                                    <td className="px-6 py-4 text-right text-red-700">{formatCurrency(data.totalExpenses)}</td>
                                    <td className="px-6 py-4 text-right">100%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* 4. CASH POSITION */}
            {activeTab === 'cash-position' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <div className="p-5 border-b">
                            <h3 className="text-lg font-semibold text-gray-800">Cash Position Report</h3>
                            <p className="text-sm text-gray-500">Where the HOA funds are stored (Inflow Summary)</p>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-white rounded shadow-sm mr-3">
                                            <BanknoteIcon className="text-gray-600" />
                                        </div>
                                        <span className="font-medium text-gray-700">Cash on Hand</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{formatCurrency(data.cashPosition.cashOnHand)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-white rounded shadow-sm mr-3">
                                            <SmartphoneIcon className="text-blue-600" />
                                        </div>
                                        <span className="font-medium text-gray-700">G-Cash Wallet</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{formatCurrency(data.cashPosition.gcash)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-white rounded shadow-sm mr-3">
                                            <Landmark className="text-green-600" />
                                        </div>
                                        <span className="font-medium text-gray-700">Bank Account</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{formatCurrency(data.cashPosition.bank)}</span>
                                </div>
                            </div>
                             <p className="mt-4 text-xs text-gray-400">Note: This view shows total inflows by channel. Actual current balances depend on expense disbursement sources.</p>
                        </div>
                    </Card>
                </div>
            )}

            {/* 5. ACCOUNTS RECEIVABLE */}
            {activeTab === 'receivables' && (
                <Card>
                    <div className="p-5 border-b flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800">Accounts Receivable Report</h3>
                        <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold">
                            Total Unpaid: {formatCurrency(data.accountsReceivable)}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Homeowner</th>
                                    <th className="px-6 py-3">Unit</th>
                                    <th className="px-6 py-3 text-right">Unpaid Months</th>
                                    <th className="px-6 py-3 text-right">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.accountsReceivableList.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center p-8">No unpaid dues. Excellent!</td></tr>
                                ) : (
                                    data.accountsReceivableList.map((item, idx) => (
                                        <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                            <td className="px-6 py-4">{item.unit}</td>
                                            <td className="px-6 py-4 text-right text-orange-600 font-bold">{item.months}</td>
                                            <td className="px-6 py-4 text-right font-bold text-red-600">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* 6. DISBURSEMENT LEDGER */}
            {activeTab === 'ledger' && (
                <Card>
                    <div className="p-5 border-b">
                        <h3 className="text-lg font-semibold text-gray-800">Detailed Cash Disbursement Ledger</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Payee</th>
                                    <th className="px-6 py-3">Category</th>
                                    <th className="px-6 py-3">Description</th>
                                    <th className="px-6 py-3 text-right">Amount</th>
                                    <th className="px-6 py-3">Encoded By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.expensesLedger.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center p-8">No ledger entries found.</td></tr>
                                ) : (
                                    data.expensesLedger.map((exp) => (
                                        <tr key={exp.expense_id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4">{new Date(exp.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-medium">{exp.payee}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{exp.description}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-800">{formatCurrency(exp.amount)}</td>
                                            <td className="px-6 py-4 text-xs text-gray-500">{exp.created_by}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <AddExpenseModal 
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                onSuccess={fetchFinancials}
            />
        </div>
    );
};

// Helper icons for local usage
const BanknoteIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
)
const SmartphoneIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
)

export default FinancialReportsPage;
