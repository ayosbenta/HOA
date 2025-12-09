
import React, { useState, useEffect } from 'react';
import { getProjects, deleteProject, recordCashPaymentIntent, getProjectContributions, updatePaymentStatus } from '../services/googleSheetsApi';
import { Project, ProjectStatus, UserRole, Due, ProjectContribution } from '../types';
import { Plus, Edit, Trash2, Calendar, ClipboardList, HandCoins, Check, XCircle, Receipt } from 'lucide-react';
import Card from '../components/ui/Card';
import ProjectModal from '../components/modals/ProjectModal';
import { useAuth } from '../contexts/AuthContext';
import ProjectContributionModal from '../components/modals/ProjectContributionModal';
import PaymentMethodModal from '../components/modals/PaymentMethodModal';
import PaymentModal from '../components/modals/PaymentModal';
import AdminProjectContributionModal from '../components/modals/AdminProjectContributionModal';
import ReceiptModal from '../components/modals/ReceiptModal';

const ProjectsPage: React.FC = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | undefined>(undefined);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('All');
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'overview' | 'contributions'>('overview');
    const [contributions, setContributions] = useState<ProjectContribution[]>([]);
    const [loadingContributions, setLoadingContributions] = useState(false);

    // Contribution States (Homeowner)
    const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [fakeDue, setFakeDue] = useState<Due | null>(null);
    
    // Admin Contribution States
    const [isAdminContributionModalOpen, setIsAdminContributionModalOpen] = useState(false);
    const [viewingContribution, setViewingContribution] = useState<Due | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    
    // Payment States
    const [isPaymentMethodOpen, setIsPaymentMethodOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isSubmittingCash, setIsSubmittingCash] = useState(false);

    const isAdmin = user?.role === UserRole.ADMIN;
    const isHomeowner = user?.role === UserRole.HOMEOWNER;

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const data = await getProjects();
            setProjects(data);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchContributions = async () => {
        if (!isAdmin) return;
        try {
            setLoadingContributions(true);
            const data = await getProjectContributions();
            setContributions(data);
        } catch (error) {
            console.error("Failed to fetch contributions", error);
        } finally {
            setLoadingContributions(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (activeTab === 'contributions' && isAdmin) {
            fetchContributions();
        }
    }, [activeTab, isAdmin]);

    const handleAdd = () => {
        setProjectToEdit(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (project: Project) => {
        setProjectToEdit(project);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;

        setDeletingId(id);
        try {
            await deleteProject(id);
            setProjects(prev => prev.filter(p => p.project_id !== id));
        } catch (error) {
            alert("Failed to delete project.");
            console.error(error);
        } finally {
            setDeletingId(null);
        }
    };

    // Contribution Handlers
    const handleContribute = (project: Project) => {
        setSelectedProject(project);
        setIsContributionModalOpen(true);
    };

    const onContributionAmountSubmit = (amount: number) => {
        if (!selectedProject || !user) return;
        setIsContributionModalOpen(false);

        const tempDue: Due = {
            due_id: `PROJ::${selectedProject.project_id}::${user.user_id}::${Date.now()}`,
            user_id: user.user_id,
            billing_month: `Contribution: ${selectedProject.name}`,
            amount: amount,
            penalty: 0,
            total_due: amount,
            status: 'unpaid'
        };
        setFakeDue(tempDue);
        setIsPaymentMethodOpen(true);
    };

    const handleSelectGcash = () => {
        setIsPaymentMethodOpen(false);
        setIsPaymentModalOpen(true);
    };

    const handleSelectCash = async () => {
        if (!fakeDue) return;
        
        const confirmed = window.confirm(
            'You have selected to pay in cash. Please proceed to the HOA admin office to complete your contribution.\n\nYour contribution will be recorded as "Pending" until verified.'
        );

        if (confirmed) {
            setIsSubmittingCash(true);
            try {
                await recordCashPaymentIntent(fakeDue.due_id, fakeDue.total_due);
                setIsPaymentMethodOpen(false);
                setFakeDue(null);
                setSelectedProject(null);
                alert("Cash payment intent recorded. Please visit the admin office.");
            } catch (error) {
                console.error("Failed to record cash payment intent:", error);
                alert("Error recording payment intent.");
            } finally {
                setIsSubmittingCash(false);
            }
        }
    };

    const handlePaymentSuccess = () => {
        setIsPaymentModalOpen(false);
        setFakeDue(null);
        setSelectedProject(null);
        alert("Thank you for your contribution! It is now pending verification.");
        fetchProjects(); 
    };

    // Admin Contribution Handlers
    const handleVerifyContribution = async (contribution: ProjectContribution) => {
        if(!window.confirm(`Verify contribution of ₱${contribution.amount} from ${contribution.homeowner_name}?`)) return;
        
        try {
            await updatePaymentStatus({
                paymentId: contribution.payment_id,
                status: 'verified'
            });
            fetchContributions();
            fetchProjects(); // Update funds
        } catch (error) {
            alert("Failed to verify contribution.");
        }
    };

    const handleViewReceipt = (contribution: ProjectContribution) => {
        // Construct a partial Due object for the ReceiptModal
        const tempDue: Due = {
            due_id: contribution.due_id,
            user_id: contribution.user_id,
            billing_month: `Contribution: ${contribution.project_name}`,
            amount: contribution.amount,
            penalty: 0,
            total_due: contribution.amount,
            status: 'paid', // Irrelevant for display
            payment: contribution
        };
        setViewingContribution(tempDue);
        setIsReceiptModalOpen(true);
    };

    const formatCurrency = (amount: number) => {
        return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getStatusColor = (status: ProjectStatus) => {
        switch (status) {
            case 'Planning': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Ongoing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredProjects = filterStatus === 'All' 
        ? projects 
        : projects.filter(p => p.status === filterStatus);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <ClipboardList className="mr-3 text-brand-secondary" />
                    Projects & Planning
                </h2>
                
                <div className="flex flex-wrap gap-2 items-center">
                     {activeTab === 'overview' && (
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-white"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Planning">Planning</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Completed">Completed</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                     )}
                    
                    {isAdmin && activeTab === 'overview' && (
                        <button
                            onClick={handleAdd}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark focus:outline-none"
                        >
                            <Plus className="mr-2 -ml-1 h-5 w-5" />
                            Create Project
                        </button>
                    )}

                    {isAdmin && activeTab === 'contributions' && (
                         <button
                            onClick={() => setIsAdminContributionModalOpen(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark focus:outline-none"
                        >
                            <HandCoins className="mr-2 -ml-1 h-5 w-5" />
                            Record Contribution
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs for Admin */}
            {isAdmin && (
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`${
                                activeTab === 'overview'
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Projects Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('contributions')}
                            className={`${
                                activeTab === 'contributions'
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Contributions
                        </button>
                    </nav>
                </div>
            )}

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <>
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <Card className="text-center p-12 text-gray-500">
                            <ClipboardList className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                            <p>No projects found.</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredProjects.map((project) => {
                                const percentSpent = project.budget > 0 ? Math.min((project.funds_spent / project.budget) * 100, 100) : 0;
                                const percentAllocated = project.budget > 0 ? Math.min((project.funds_allocated / project.budget) * 100, 100) : 0;

                                return (
                                    <Card key={project.project_id} className="flex flex-col h-full border-t-4 border-t-brand-primary">
                                        <div className="p-5 flex-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                                                    {project.status}
                                                </span>
                                                {isAdmin && (
                                                    <div className="flex space-x-2">
                                                        <button 
                                                            onClick={() => handleEdit(project)}
                                                            className="text-gray-400 hover:text-brand-primary transition-colors"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(project.project_id)}
                                                            disabled={deletingId === project.project_id}
                                                            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                        >
                                                            {deletingId === project.project_id ? (
                                                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                                            ) : (
                                                                <Trash2 size={18} />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-xl font-bold text-gray-800 mb-2">{project.name}</h3>
                                            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.description}</p>

                                            <div className="space-y-3 text-sm">
                                                <div className="flex items-center text-gray-500">
                                                    <Calendar className="w-4 h-4 mr-2" />
                                                    <span>
                                                        {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'TBD'} 
                                                        {' - '} 
                                                        {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'TBD'}
                                                    </span>
                                                </div>

                                                <div className="pt-2">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-gray-500 font-medium">Budget Usage</span>
                                                        <span className="text-gray-700 font-bold">{Math.round(percentSpent)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1 overflow-hidden">
                                                        <div 
                                                            className="bg-brand-secondary h-2.5 rounded-full" 
                                                            style={{ width: `${percentSpent}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-gray-500">
                                                        <span>Spent: {formatCurrency(project.funds_spent)}</span>
                                                        <span>Budget: {formatCurrency(project.budget)}</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Funds Allocated</p>
                                                        <p className="font-semibold text-gray-800">{formatCurrency(project.funds_allocated)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Remaining Budget</p>
                                                        <p className={`font-semibold ${project.budget - project.funds_spent < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {formatCurrency(project.budget - project.funds_spent)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isHomeowner && project.status !== 'Rejected' && project.status !== 'Completed' && (
                                                    <div className="pt-4 mt-2 border-t">
                                                        <button 
                                                            onClick={() => handleContribute(project)}
                                                            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none transition-colors"
                                                        >
                                                            <HandCoins className="mr-2 h-4 w-4" />
                                                            Contribute Funds
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* CONTRIBUTIONS TAB */}
            {activeTab === 'contributions' && isAdmin && (
                <Card>
                    <div className="overflow-x-auto">
                        {loadingContributions ? (
                             <div className="text-center p-8">Loading contributions...</div>
                        ) : contributions.length === 0 ? (
                             <div className="text-center p-8 text-gray-500">No contributions recorded yet.</div>
                        ) : (
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Project</th>
                                        <th className="px-6 py-3">Homeowner</th>
                                        <th className="px-6 py-3">Unit</th>
                                        <th className="px-6 py-3 text-right">Amount</th>
                                        <th className="px-6 py-3">Method</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contributions.map((contrib) => (
                                        <tr key={contrib.payment_id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4">{new Date(contrib.date_paid).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{contrib.project_name}</td>
                                            <td className="px-6 py-4">{contrib.homeowner_name}</td>
                                            <td className="px-6 py-4">{contrib.homeowner_unit}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-800">{formatCurrency(contrib.amount)}</td>
                                            <td className="px-6 py-4">{contrib.method}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    contrib.status === 'verified' ? 'bg-green-100 text-green-800' :
                                                    contrib.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {contrib.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {contrib.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleVerifyContribution(contrib)}
                                                            className="text-green-600 hover:text-green-800"
                                                            title="Verify"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                    )}
                                                    {(contrib.status === 'verified' || contrib.status === 'pending') && (
                                                        <button 
                                                            onClick={() => handleViewReceipt(contrib)}
                                                            className="text-blue-600 hover:text-blue-800"
                                                            title="View Details/Receipt"
                                                        >
                                                            <Receipt size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            )}

            {/* Modals */}
            {isAdmin && (
                <>
                    <ProjectModal 
                        isOpen={isModalOpen} 
                        onClose={() => setIsModalOpen(false)} 
                        onSuccess={fetchProjects} 
                        projectToEdit={projectToEdit}
                    />
                    <AdminProjectContributionModal
                        isOpen={isAdminContributionModalOpen}
                        onClose={() => setIsAdminContributionModalOpen(false)}
                        onSuccess={() => {
                            fetchContributions();
                            fetchProjects();
                        }}
                        activeProjects={projects.filter(p => p.status !== 'Completed' && p.status !== 'Rejected')}
                    />
                    <ReceiptModal
                        isOpen={isReceiptModalOpen}
                        onClose={() => setIsReceiptModalOpen(false)}
                        due={viewingContribution}
                        user={user!}
                        onUpdate={() => {
                            setIsReceiptModalOpen(false);
                            fetchContributions();
                            fetchProjects();
                        }}
                    />
                </>
            )}

            {isHomeowner && (
                <>
                    <ProjectContributionModal
                        isOpen={isContributionModalOpen}
                        onClose={() => setIsContributionModalOpen(false)}
                        onSubmit={onContributionAmountSubmit}
                        project={selectedProject}
                    />
                    
                    <PaymentMethodModal
                        isOpen={isPaymentMethodOpen}
                        onClose={() => setIsPaymentMethodOpen(false)}
                        due={fakeDue}
                        onSelectGcash={handleSelectGcash}
                        onSelectCash={handleSelectCash}
                        isSubmittingCash={isSubmittingCash}
                    />
                    
                    <PaymentModal
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        due={fakeDue}
                        onSuccess={handlePaymentSuccess}
                    />
                </>
            )}
        </div>
    );
};

export default ProjectsPage;
