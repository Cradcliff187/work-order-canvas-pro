import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProjects, useDeleteProject, Project } from '@/hooks/useProjects';
import { ProjectsTable } from '@/components/admin/projects/ProjectsTable';
import { CreateProjectModal } from '@/components/admin/projects/CreateProjectModal';
import { EditProjectModal } from '@/components/admin/projects/EditProjectModal';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAdminFilters } from '@/hooks/useAdminFilters';
import { ProjectFiltersValue } from '@/components/admin/projects/CompactProjectFilters';

const initialFilters: ProjectFiltersValue = {
  status: [],
};

export default function Projects() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([]);
  
  const { filters, setFilters, clearFilters } = useAdminFilters<ProjectFiltersValue>(
    'admin-projects-filters-v2',
    initialFilters
  );
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const { data, isLoading, isError } = useProjects(pagination, { sortBy: sorting }, {});
  const deleteProject = useDeleteProject();

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setEditModalOpen(true);
  };

  const handleDelete = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      await deleteProject.mutateAsync(projectToDelete.id);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Error loading projects</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <ProjectsTable
        data={data?.data || []}
        totalCount={data?.totalCount || 0}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateProject={() => setCreateModalOpen(true)}
        filters={filters}
        onFiltersChange={setFilters}
        onFiltersClear={clearFilters}
      />

      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <EditProjectModal
        project={selectedProject}
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) setSelectedProject(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteProject.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProject.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
