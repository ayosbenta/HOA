
import React, { useState, useEffect } from 'react';
import { X, Briefcase, Calendar, DollarSign } from 'lucide-react';
import { createProject, updateProject } from '../../services/googleSheetsApi';
import { Project, ProjectPayload, ProjectStatus } from '../../types';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    projectToEdit?: Project;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSuccess, projectToEdit }) => {
    const initialState: ProjectPayload = {
        name: '',
        description: '',
        status: 'Planning',
        start_date: '',
        end_date: '',
        budget: 0,
        funds_allocated: 0,
        funds_spent: 0
    };

    const [formData, setFormData] = useState<ProjectPayload>(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (projectToEdit) {
                setFormData({
                    name: projectToEdit.name,
                    description: projectToEdit.description,
                    status: projectToEdit.status,
                    start_date: projectToEdit.start_date,
                    end_date: projectToEdit.end_date,
                    budget: projectToEdit.budget,
                    funds_allocated: projectToEdit.funds_allocated,
                    funds_spent: projectToEdit.funds_spent
                });
            } else {
                setFormData(initialState);
            }
            setError('');
        }
    }, [isOpen, projectToEdit]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            if (projectToEdit) {
                await updateProject(projectToEdit.project_id, formData);
            } else {
                await createProject(formData);
            }
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save project.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all flex flex-col max-h-[90vh]">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <Briefcase className="mr-2 text-brand-secondary" />
                        {projectToEdit ? 'Edit Project' : 'Create New Project'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Project Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                    placeholder="e.g., Road Repair Phase 2"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    name="description"
                                    id="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                    placeholder="Project details and objectives..."
                                ></textarea>
                            </div>

                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    name="status"
                                    id="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-white"
                                >
                                    <option value="Planning">Planning</option>
                                    <option value="Ongoing">Ongoing</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 my-4"></div>

                        {/* Dates */}
                        <div>
                             <h4 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
                                <Calendar className="w-4 h-4 mr-2 text-gray-500" /> Timeline
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">Start Date</label>
                                    <input
                                        type="date"
                                        name="start_date"
                                        id="start_date"
                                        value={formData.start_date}
                                        onChange={handleChange}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">Target End Date</label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        id="end_date"
                                        value={formData.end_date}
                                        onChange={handleChange}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                    />
                                </div>
                             </div>
                        </div>

                        <div className="border-t border-gray-200 my-4"></div>

                        {/* Financials */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
                                <DollarSign className="w-4 h-4 mr-2 text-gray-500" /> Financials
                             </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label htmlFor="budget" className="block text-sm font-medium text-gray-700">Total Budget</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-gray-500 sm:text-sm">₱</span>
                                        </div>
                                        <input
                                            type="number"
                                            name="budget"
                                            id="budget"
                                            value={formData.budget}
                                            onChange={handleChange}
                                            className="block w-full pl-7 rounded-md border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="funds_allocated" className="block text-sm font-medium text-gray-700">Funds Allocated</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-gray-500 sm:text-sm">₱</span>
                                        </div>
                                        <input
                                            type="number"
                                            name="funds_allocated"
                                            id="funds_allocated"
                                            value={formData.funds_allocated}
                                            onChange={handleChange}
                                            className="block w-full pl-7 rounded-md border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="funds_spent" className="block text-sm font-medium text-gray-700">Funds Spent</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-gray-500 sm:text-sm">₱</span>
                                        </div>
                                        <input
                                            type="number"
                                            name="funds_spent"
                                            id="funds_spent"
                                            value={formData.funds_spent}
                                            onChange={handleChange}
                                            className="block w-full pl-7 rounded-md border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
                    </form>
                </div>

                <div className="p-5 bg-gray-50 border-t flex justify-end gap-3 rounded-b-lg">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="project-form"
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-brand-primary border border-transparent rounded-md hover:bg-brand-dark disabled:bg-gray-400 flex items-center min-w-[100px] justify-center transition-colors"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            projectToEdit ? 'Save Changes' : 'Create Project'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectModal;
