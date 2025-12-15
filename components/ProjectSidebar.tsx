import React, { useMemo } from 'react';
import { ProjectItem } from '../types';
import { FileVideo, FileText, Subtitles, Clock, ChevronRight, Folder } from 'lucide-react';

interface ProjectSidebarProps {
  projects: ProjectItem[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
}) => {
  const formatDuration = (seconds: number): string => {
    if (!seconds) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Group projects by folder
  const groupedProjects = useMemo(() => {
    const groups: { [folder: string]: ProjectItem[] } = {};
    
    projects.forEach((project) => {
      // Extract folder from project ID (which includes relative path)
      const lastSlash = project.id.lastIndexOf('/');
      const folder = lastSlash > -1 ? project.id.substring(0, lastSlash) : '';
      
      if (!groups[folder]) {
        groups[folder] = [];
      }
      groups[folder].push(project);
    });
    
    // Sort folders alphabetically (root folder first)
    const sortedFolders = Object.keys(groups).sort((a, b) => {
      if (a === '') return -1;
      if (b === '') return 1;
      return a.localeCompare(b);
    });
    
    return sortedFolders.map(folder => ({
      folder,
      projects: groups[folder],
    }));
  }, [projects]);

  if (projects.length === 0) {
    return (
      <div className="w-full h-full bg-slate-900 border-r border-slate-800 p-6 flex flex-col items-center justify-center text-slate-500">
        <FileVideo size={48} className="mb-4 opacity-50" />
        <p className="text-sm text-center">
          No videos found in workspace
        </p>
        <p className="text-xs mt-2 text-center text-slate-600">
          Add video files to this folder
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <FileVideo size={16} />
          Videos ({projects.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groupedProjects.map(({ folder, projects: folderProjects }) => (
          <div key={folder}>
            {/* Folder header (only show if not root) */}
            {folder && (
              <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 sticky top-0 z-10">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Folder size={14} />
                  <span className="font-medium">{folder}</span>
                  <span className="text-slate-600">({folderProjects.length})</span>
                </div>
              </div>
            )}
            
            {/* Projects in this folder */}
            {folderProjects.map((project) => {
              const isActive = project.id === currentProjectId;
              const hasNotes = project.notes.length > 0;
              const hasSubtitles = project.subtitles.length > 0;

              return (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className={`w-full text-left p-4 border-b border-slate-800 transition-all ${
                    isActive
                      ? 'bg-blue-600/10 border-l-4 border-l-blue-500'
                      : 'hover:bg-slate-800/50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className={`text-sm font-medium truncate flex-1 ${
                      isActive ? 'text-blue-200' : 'text-slate-200'
                    }`}>
                      {project.name}
                    </h4>
                    {isActive && (
                      <ChevronRight size={16} className="text-blue-400 flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {project.duration > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDuration(project.duration)}
                      </span>
                    )}
                    {hasNotes && (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <FileText size={12} />
                        {project.notes.length}
                      </span>
                    )}
                    {hasSubtitles && (
                      <span className="flex items-center gap-1 text-violet-500">
                        <Subtitles size={12} />
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 mt-2">
                    {formatDate(project.lastModified)}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
