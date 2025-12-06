import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/ui/Card';
import { getCCTVList, deleteCCTV } from '../services/googleSheetsApi';
import { CCTV, UserRole } from '../types';
import { Video, Plus, Trash2, VideoOff, Maximize, Pencil } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CCTVModal from '../components/modals/CCTVModal';

const CCTVPage: React.FC = () => {
    const { user } = useAuth();
    const [cameras, setCameras] = useState<CCTV[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingCamera, setEditingCamera] = useState<CCTV | undefined>(undefined);
    
    // Refs to hold the video container elements for full screen
    const videoContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const fetchCameras = async () => {
        try {
            setLoading(true);
            const data = await getCCTVList();
            setCameras(data);
        } catch (error) {
            console.error("Failed to fetch CCTV list", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCameras();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this camera?")) return;
        
        setDeletingId(id);
        try {
            await deleteCCTV(id);
            setCameras(prev => prev.filter(cam => cam.cctv_id !== id));
        } catch (error) {
            alert("Failed to delete camera.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleEdit = (camera: CCTV) => {
        setEditingCamera(camera);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingCamera(undefined);
        setIsModalOpen(true);
    };

    const toggleFullScreen = (cctvId: string) => {
        const element = videoContainerRefs.current[cctvId];
        if (!element) return;

        if (!document.fullscreenElement) {
            element.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const isAdmin = user?.role === UserRole.ADMIN;

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <Video className="mr-3 text-brand-secondary" />
                    CCTV Monitoring
                </h2>
                {isAdmin && (
                    <button
                        onClick={handleAdd}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark focus:outline-none"
                    >
                        <Plus className="mr-2 -ml-1 h-5 w-5" />
                        Add Camera
                    </button>
                )}
            </div>

            {loading ? (
                 <div className="text-center p-8">Loading camera feeds...</div>
            ) : cameras.length === 0 ? (
                <Card className="text-center p-12 text-gray-500">
                    <VideoOff className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p>No CCTV cameras configured.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cameras.map((cam) => (
                        <Card key={cam.cctv_id} className="overflow-hidden">
                            <div 
                                ref={el => { videoContainerRefs.current[cam.cctv_id] = el; }}
                                className="aspect-video bg-black relative flex justify-center items-center group"
                            >
                                {/* 
                                  Note: Direct RTSP streams are not supported in browsers. 
                                  This implementation assumes the stream_url provided is an HTTP/MJPEG/HLS URL 
                                  or a direct video file link.
                                */}
                                <video 
                                    src={cam.stream_url} 
                                    controls 
                                    autoPlay 
                                    muted 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // Fallback UI if video fails to load
                                        const target = e.target as HTMLVideoElement;
                                        target.style.display = 'none';
                                        if (target.parentElement) {
                                            // Don't overwrite parent innerHTML so buttons persist, just append error msg or hide video
                                            const msg = document.createElement('div');
                                            msg.className = "text-white text-sm p-4 text-center absolute inset-0 flex flex-col justify-center items-center";
                                            msg.innerHTML = '<p class="font-bold text-red-400">Stream Unavailable</p><p class="text-xs text-gray-400 mt-1">Check URL or network.</p>';
                                            target.parentElement.appendChild(msg);
                                        }
                                    }}
                                />
                                
                                {/* Full Screen Button Overlay */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                    <button 
                                        onClick={() => toggleFullScreen(cam.cctv_id)} 
                                        className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 focus:outline-none backdrop-blur-sm shadow-sm"
                                        title="Toggle Full Screen"
                                    >
                                        <Maximize size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 flex justify-between items-center bg-white">
                                <h3 className="font-semibold text-gray-800">{cam.name}</h3>
                                {isAdmin && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleEdit(cam)}
                                            className="text-gray-400 hover:text-brand-primary"
                                            title="Edit Camera"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(cam.cctv_id)}
                                            disabled={deletingId === cam.cctv_id}
                                            className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                                            title="Delete Camera"
                                        >
                                            {deletingId === cam.cctv_id ? (
                                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <Trash2 size={18} />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {isAdmin && (
                <CCTVModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    onSuccess={fetchCameras} 
                    cctvToEdit={editingCamera}
                />
            )}
        </div>
    );
};

export default CCTVPage;