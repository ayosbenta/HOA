
import React, { useState, useEffect } from 'react';
import { getProjects, deleteProject } from '../services/googleSheetsApi';
import { Project, ProjectStatus } from '../types';
import { Plus, Edit, Trash2, Calendar, ClipboardList, TrendingUp } from 'lucide-react';
import Card from '../components/ui/Card';
import ProjectModal from '../components/modals/ProjectModal';

const ProjectsPage: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | undefined>(undefined);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('All');

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

    useEffect(() => {
        fetchProjects();
    }, []);

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
                
                <div className="flex flex-wrap gap-2">
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
                    <button
                        onClick={handleAdd}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark focus:outline-none"
                    >
                        <Plus className="mr-2 -ml-1 h-5 w-5" />
                        Create Project
                    </button>
                </div>
            </div>

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
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <ProjectModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={fetchProjects} 
                projectToEdit={projectToEdit}
            />
        </div>
    );
};

export default ProjectsPage;
