import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AddEmployeeModal } from '@/components/admin/employees/AddEmployeeModal';
import { EditEmployeeRatesModal } from '@/components/admin/employees/EditEmployeeRatesModal';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { TableActionsDropdown, TableAction } from '@/components/ui/table-actions-dropdown';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEmployees, useEmployeeMutations, formatCurrency, Employee } from '@/hooks/useEmployees';
import { Users, UserPlus, Search, DollarSign, Edit, UserCheck, Power, TrendingUp } from 'lucide-react';

export default function AdminEmployees() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRatesEmployee, setEditRatesEmployee] = useState<Employee | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data, isLoading, refetch } = useEmployees();
  const { toggleEmployeeStatus } = useEmployeeMutations();
  const isMobile = useIsMobile();

  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    
    return data.employees.filter((employee) => {
      const matchesSearch = 
        employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesActiveFilter = 
        activeFilter === 'all' || 
        (activeFilter === 'active' && employee.is_active) ||
        (activeFilter === 'inactive' && !employee.is_active);
      
      return matchesSearch && matchesActiveFilter;
    });
  }, [data?.employees, searchTerm, activeFilter]);

  const handleToggleStatus = async (employeeId: string, currentStatus: boolean) => {
    try {
      await toggleEmployeeStatus.mutateAsync({
        employeeId,
        isActive: !currentStatus,
      });
    } catch (error) {
      console.error('Failed to toggle employee status:', error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">
            Manage internal employees and their billing rates
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.activeCount || 0} active, {data?.inactiveCount || 0} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.activeCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Cost Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.averageCostRate ? `$${data.averageCostRate.toFixed(2)}` : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average hourly cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Billable Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.averageBillableRate ? `$${data.averageBillableRate.toFixed(2)}` : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average billable rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>
            View and manage employee information and billing rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('all')}
              >
                All ({data?.totalCount || 0})
              </Button>
              <Button
                variant={activeFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('active')}
              >
                Active ({data?.activeCount || 0})
              </Button>
              <Button
                variant={activeFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('inactive')}
              >
                Inactive ({data?.inactiveCount || 0})
              </Button>
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <EmptyTableState
              icon={Users}
              title={searchTerm ? "No employees found matching your search" : "No employees found"}
              description={!searchTerm ? "Get started by adding your first employee" : "Try adjusting your search criteria"}
              action={{
                label: "Add Employee",
                onClick: () => setShowAddModal(true),
                icon: UserPlus
              }}
              colSpan={6}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block rounded-md border">
                <Table className="admin-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Cost Rate</TableHead>
                      <TableHead>Billable Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow 
                        key={employee.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={(e) => {
                          // Don't navigate if clicking interactive elements
                          const target = e.target as HTMLElement;
                          if (target instanceof HTMLButtonElement || 
                              target instanceof HTMLInputElement ||
                              target.closest('[role="checkbox"]') ||
                              target.closest('[data-radix-collection-item]') ||
                              target.closest('.dropdown-trigger')) {
                            return;
                          }
                          setEditRatesEmployee(employee);
                        }}
                      >
                        <TableCell className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {formatCurrency(employee.hourly_cost_rate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {formatCurrency(employee.hourly_billable_rate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={employee.is_active ? 'default' : 'secondary'}
                            className="h-5 text-[10px] px-1.5"
                          >
                            {employee.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                         <TableCell onClick={(e) => e.stopPropagation()}>
                           <TableActionsDropdown
                             itemName={`${employee.first_name} ${employee.last_name}`}
                             actions={[
                               {
                                 label: 'Edit Rates',
                                 icon: Edit,
                                 onClick: () => {
                                   setEditRatesEmployee(employee);
                                 },
                               },
                               {
                                 label: employee.is_active ? 'Deactivate' : 'Activate',
                                 icon: Power,
                                 onClick: () => {
                                   handleToggleStatus(employee.id, employee.is_active);
                                 },
                                 variant: employee.is_active ? 'destructive' : 'default',
                               },
                             ]}
                           />
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="block lg:hidden space-y-3">
                {filteredEmployees.map((employee) => (
                  <MobileTableCard
                    key={employee.id}
                    title={`${employee.first_name} ${employee.last_name}`}
                    subtitle={employee.email}
                    status={
                      <Badge 
                        variant={employee.is_active ? 'default' : 'secondary'}
                        className="h-5 text-[10px] px-1.5"
                      >
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    }
                    onClick={() => setEditRatesEmployee(employee)}
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cost Rate:</span>
                      <span className="font-mono">{formatCurrency(employee.hourly_cost_rate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Billable Rate:</span>
                      <span className="font-mono">{formatCurrency(employee.hourly_billable_rate)}</span>
                    </div>
                  </MobileTableCard>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddEmployeeModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => {
          refetch();
        }}
      />

      <EditEmployeeRatesModal
        open={!!editRatesEmployee}
        onOpenChange={(open) => !open && setEditRatesEmployee(null)}
        employee={editRatesEmployee}
      />
    </div>
  );
}