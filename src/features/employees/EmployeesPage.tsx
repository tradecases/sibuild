import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import type { Employee, Branch } from '../../types';

interface EmployeeForm {
  full_name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  branch_id: string;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern';
  status: 'active' | 'on_leave' | 'terminated' | 'suspended';
  join_date: string;
  basic_salary: number;
  bank_account: string;
  emergency_contact: string;
  address: string;
}

interface AttendanceRecord {
  date: string;
  present: boolean;
  employee_id: string;
}

interface SalaryRecord {
  id: string;
  employee_id: string;
  month: string;
  basic_salary: number;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  status: 'pending' | 'paid';
  payment_date: string | null;
  employee?: Employee;
}

export function EmployeesPage() {
  const [activeTab, setActiveTab] = useState('employees');
  const showToast = useUiStore((state) => state.showToast);

  // Employees
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>({
    full_name: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    branch_id: '',
    employment_type: 'full_time',
    status: 'active',
    join_date: new Date().toISOString().split('T')[0],
    basic_salary: 0,
    bank_account: '',
    emergency_contact: '',
    address: '',
  });

  // Attendance
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState({ present: 0, absent: 0, leave: 0 });

  // Payroll
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [showGenerateSalaryModal, setShowGenerateSalaryModal] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
  const [selectedEmployeeForSalary, setSelectedEmployeeForSalary] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'employees') {
      loadEmployees();
      loadBranches();
    } else if (activeTab === 'attendance') {
      loadAttendance();
    } else if (activeTab === 'payroll') {
      loadSalaryRecords();
    }
  }, [activeTab]);

  useEffect(() => {
    filterEmployees();
  }, [employeeSearch, employees]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await loadBranches();
    } catch (error) {
      console.error('Error loading initial data:', error);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true });
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      showToast('Error loading employees', 'error');
    }
  };

  const loadBranches = async () => {
    try {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true);
      setBranches(data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadAttendance = async () => {
    try {
      // Mock attendance data - in real app would fetch from attendance table
      const monthDays = new Date(attendanceMonth + '-01');
      const daysInMonth = new Date(monthDays.getFullYear(), monthDays.getMonth() + 1, 0).getDate();

      const mockData: AttendanceRecord[] = [];
      for (let i = 0; i < employees.length; i++) {
        for (let day = 1; day <= daysInMonth; day++) {
          mockData.push({
            date: `${attendanceMonth}-${String(day).padStart(2, '0')}`,
            present: Math.random() > 0.1, // 90% present
            employee_id: employees[i].id,
          });
        }
      }

      setAttendanceData(mockData);

      // Calculate summary for today
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = mockData.filter(a => a.date === today);
      const presentCount = todayRecords.filter(a => a.present).length;

      setAttendanceSummary({
        present: presentCount,
        absent: todayRecords.length - presentCount,
        leave: 0,
      });
    } catch (error) {
      console.error('Error loading attendance:', error);
      showToast('Error loading attendance', 'error');
    }
  };

  const loadSalaryRecords = async () => {
    try {
      // Mock salary records
      const mockRecords: SalaryRecord[] = employees.map(e => ({
        id: `${e.id}-${salaryMonth}`,
        employee_id: e.id,
        month: salaryMonth,
        basic_salary: e.basic_salary,
        gross_salary: e.basic_salary,
        deductions: e.basic_salary * 0.05,
        net_salary: e.basic_salary * 0.95,
        status: Math.random() > 0.5 ? 'paid' : 'pending',
        payment_date: Math.random() > 0.5 ? new Date().toISOString().split('T')[0] : null,
        employee: e,
      }));

      setSalaryRecords(mockRecords);
    } catch (error) {
      console.error('Error loading salary records:', error);
      showToast('Error loading salary records', 'error');
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    if (employeeSearch) {
      filtered = filtered.filter(e =>
        e.full_name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.email?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.designation?.toLowerCase().includes(employeeSearch.toLowerCase())
      );
    }

    setFilteredEmployees(filtered);
  };

  const handleSaveEmployee = async () => {
    if (!employeeForm.full_name || !employeeForm.designation || !employeeForm.join_date) {
      showToast('Please fill all required fields', 'warning');
      return;
    }

    try {
      const data = {
        ...employeeForm,
        employee_id: `EMP-${Date.now()}`,
      };

      if (editingId) {
        const { error } = await supabase
          .from('employees')
          .update(data)
          .eq('id', editingId);
        if (error) throw error;
        showToast('Employee updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('employees')
          .insert([data]);
        if (error) throw error;
        showToast('Employee created successfully', 'success');
      }

      setShowEmployeeModal(false);
      resetEmployeeForm();
      loadEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      showToast('Error saving employee', 'error');
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      full_name: '',
      email: '',
      phone: '',
      designation: '',
      department: '',
      branch_id: '',
      employment_type: 'full_time',
      status: 'active',
      join_date: new Date().toISOString().split('T')[0],
      basic_salary: 0,
      bank_account: '',
      emergency_contact: '',
      address: '',
    });
    setEditingId(null);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEmployeeForm({
      full_name: employee.full_name,
      email: employee.email || '',
      phone: employee.phone || '',
      designation: employee.designation || '',
      department: employee.department || '',
      branch_id: employee.branch_id || '',
      employment_type: employee.employment_type,
      status: employee.status,
      join_date: employee.join_date,
      basic_salary: employee.basic_salary,
      bank_account: employee.bank_account || '',
      emergency_contact: employee.emergency_contact || '',
      address: employee.address || '',
    });
    setEditingId(employee.id);
    setShowEmployeeModal(true);
  };

  const handleMarkAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // In a real app, would insert/update attendance records
      showToast('Attendance marked for today', 'success');
      loadAttendance();
    } catch (error) {
      console.error('Error marking attendance:', error);
      showToast('Error marking attendance', 'error');
    }
  };

  const handleGenerateSalary = async () => {
    if (!selectedEmployeeForSalary) {
      showToast('Please select an employee', 'warning');
      return;
    }

    try {
      // In a real app, would create salary record
      showToast('Salary generated successfully', 'success');
      setShowGenerateSalaryModal(false);
      setSelectedEmployeeForSalary('');
      loadSalaryRecords();
    } catch (error) {
      console.error('Error generating salary:', error);
      showToast('Error generating salary', 'error');
    }
  };

  const handleMarkSalaryPaid = async (salaryId: string) => {
    try {
      // In a real app, would update salary record
      showToast('Salary marked as paid', 'success');
      loadSalaryRecords();
    } catch (error) {
      console.error('Error marking salary as paid:', error);
      showToast('Error marking salary as paid', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500 mt-1">Manage staff, attendance, and payroll</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'employees', label: 'Employees' },
          { id: 'attendance', label: 'Attendance' },
          { id: 'payroll', label: 'Payroll' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                leftIcon={<Search size={16} />}
                placeholder="Search employees..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
            </div>
            <Button leftIcon={<Plus size={16} />} onClick={() => { resetEmployeeForm(); setShowEmployeeModal(true); }}>
              Add Employee
            </Button>
          </div>

          <Card>
            {loading ? (
              <SkeletonTable rows={5} cols={7} />
            ) : filteredEmployees.length > 0 ? (
              <Table
                columns={[
                  {
                    key: 'full_name',
                    label: 'Employee',
                    render: (v, row) => (
                      <div className="flex items-center gap-3">
                        <Avatar name={v} size="sm" />
                        <div>
                          <p className="font-medium text-slate-900">{v}</p>
                          <p className="text-xs text-slate-500">{(row as any).employee_id}</p>
                        </div>
                      </div>
                    ),
                  },
                  { key: 'designation', label: 'Designation' },
                  { key: 'department', label: 'Department' },
                  { key: 'employment_type', label: 'Type', render: (v) => <Badge>{v.replace('_', ' ')}</Badge> },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (v) => <StatusBadge status={v} />,
                  },
                  { key: 'join_date', label: 'Join Date', render: (v) => formatDate(v) },
                  { key: 'basic_salary', label: 'Salary', render: (v) => formatCurrency(v) },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (_, row) => (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditEmployee(row)}
                      >
                        Edit
                      </Button>
                    ),
                  },
                ]}
                data={filteredEmployees}
              />
            ) : (
              <EmptyState
                title="No employees found"
                description="Add your first employee to get started"
                size="sm"
              />
            )}
          </Card>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Monthly Attendance</h3>
                <Input
                  type="month"
                  value={attendanceMonth}
                  onChange={(e) => { setAttendanceMonth(e.target.value); loadAttendance(); }}
                  className="mt-2 max-w-xs"
                />
              </div>
              <Button leftIcon={<Calendar size={16} />} onClick={handleMarkAttendance}>
                Mark Today's Attendance
              </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-200">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-slate-600 uppercase">Present Today</p>
                <p className="text-2xl font-bold text-green-600">{attendanceSummary.present}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-slate-600 uppercase">Absent Today</p>
                <p className="text-2xl font-bold text-red-600">{attendanceSummary.absent}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-slate-600 uppercase">On Leave</p>
                <p className="text-2xl font-bold text-amber-600">{attendanceSummary.leave}</p>
              </div>
            </div>

            {/* Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Employee</th>
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() + i - 3);
                      return (
                        <th key={i} className="text-center py-3 px-2 font-medium text-slate-700">
                          {d.getDate()}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees.slice(0, 10).map(emp => (
                    <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-900 font-medium">{emp.full_name}</td>
                      {Array.from({ length: 7 }, (_, i) => (
                        <td key={i} className="text-center py-3 px-2">
                          <input
                            type="checkbox"
                            defaultChecked={Math.random() > 0.1}
                            className="w-4 h-4 rounded"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* PAYROLL TAB */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <Input
              type="month"
              value={salaryMonth}
              onChange={(e) => { setSalaryMonth(e.target.value); loadSalaryRecords(); }}
              className="max-w-xs"
            />
            <Button leftIcon={<Plus size={16} />} onClick={() => setShowGenerateSalaryModal(true)}>
              Generate Salary
            </Button>
          </div>

          <Card>
            {loading ? (
              <SkeletonTable rows={5} cols={7} />
            ) : salaryRecords.length > 0 ? (
              <Table
                columns={[
                  {
                    key: 'employee_id',
                    label: 'Employee',
                    render: (_, row) => (row as any).employee?.full_name || '-',
                  },
                  { key: 'basic_salary', label: 'Basic', render: (v) => formatCurrency(v) },
                  { key: 'gross_salary', label: 'Gross', render: (v) => formatCurrency(v) },
                  { key: 'deductions', label: 'Deductions', render: (v) => formatCurrency(v) },
                  { key: 'net_salary', label: 'Net', render: (v) => formatCurrency(v) },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (v) => <Badge variant={v === 'paid' ? 'success' : 'warning'}>{v}</Badge>,
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (v, row) => (
                      row.status === 'pending' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleMarkSalaryPaid(row.id)}
                        >
                          Mark Paid
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-500">{formatDate((row as any).payment_date)}</span>
                      )
                    ),
                  },
                ]}
                data={salaryRecords}
              />
            ) : (
              <EmptyState
                title="No salary records"
                description="Generate salary for selected month"
                size="sm"
              />
            )}
          </Card>
        </div>
      )}

      {/* Employee Modal */}
      <Modal
        isOpen={showEmployeeModal}
        onClose={() => { setShowEmployeeModal(false); resetEmployeeForm(); }}
        title={editingId ? 'Edit Employee' : 'Add Employee'}
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <Input
            label="Full Name"
            value={employeeForm.full_name}
            onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })}
            placeholder="Full name"
          />
          <Input
            label="Email"
            type="email"
            value={employeeForm.email}
            onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
            placeholder="email@example.com"
          />
          <Input
            label="Phone"
            type="tel"
            value={employeeForm.phone}
            onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
            placeholder="+971..."
          />
          <Input
            label="Designation"
            value={employeeForm.designation}
            onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
            placeholder="Job title"
          />
          <Input
            label="Department"
            value={employeeForm.department}
            onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
            placeholder="Department"
          />
          <Select
            label="Branch"
            value={employeeForm.branch_id}
            onChange={(e) => setEmployeeForm({ ...employeeForm, branch_id: e.target.value })}
            options={branches.map(b => ({ value: b.id, label: b.name }))}
          />
          <Select
            label="Employment Type"
            value={employeeForm.employment_type}
            onChange={(e) => setEmployeeForm({ ...employeeForm, employment_type: e.target.value as any })}
            options={[
              { value: 'full_time', label: 'Full Time' },
              { value: 'part_time', label: 'Part Time' },
              { value: 'contract', label: 'Contract' },
              { value: 'intern', label: 'Intern' },
            ]}
          />
          <Select
            label="Status"
            value={employeeForm.status}
            onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value as any })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'on_leave', label: 'On Leave' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'terminated', label: 'Terminated' },
            ]}
          />
          <Input
            label="Join Date"
            type="date"
            value={employeeForm.join_date}
            onChange={(e) => setEmployeeForm({ ...employeeForm, join_date: e.target.value })}
          />
          <Input
            label="Basic Salary"
            type="number"
            value={employeeForm.basic_salary}
            onChange={(e) => setEmployeeForm({ ...employeeForm, basic_salary: parseFloat(e.target.value) })}
            placeholder="0.00"
          />
          <Input
            label="Bank Account"
            value={employeeForm.bank_account}
            onChange={(e) => setEmployeeForm({ ...employeeForm, bank_account: e.target.value })}
            placeholder="Account number"
          />
          <Input
            label="Emergency Contact"
            value={employeeForm.emergency_contact}
            onChange={(e) => setEmployeeForm({ ...employeeForm, emergency_contact: e.target.value })}
            placeholder="Contact number"
          />
          <Input
            label="Address"
            value={employeeForm.address}
            onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
            placeholder="Home address"
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => { setShowEmployeeModal(false); resetEmployeeForm(); }}>Cancel</Button>
            <Button onClick={handleSaveEmployee}>{editingId ? 'Update' : 'Add'} Employee</Button>
          </div>
        </div>
      </Modal>

      {/* Generate Salary Modal */}
      <Modal
        isOpen={showGenerateSalaryModal}
        onClose={() => { setShowGenerateSalaryModal(false); setSelectedEmployeeForSalary(''); }}
        title="Generate Salary"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Month"
            type="month"
            value={salaryMonth}
            onChange={(e) => setSalaryMonth(e.target.value)}
          />
          <Select
            label="Employee"
            value={selectedEmployeeForSalary}
            onChange={(e) => setSelectedEmployeeForSalary(e.target.value)}
            options={[
              { value: '', label: 'Select an employee' },
              ...employees.map(e => ({ value: e.id, label: e.full_name })),
            ]}
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => { setShowGenerateSalaryModal(false); setSelectedEmployeeForSalary(''); }}>Cancel</Button>
            <Button onClick={handleGenerateSalary} leftIcon={<DollarSign size={16} />}>Generate Salary</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
