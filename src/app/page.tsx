'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Users, Building2, Plus, Pencil, Trash2,
  Download, Eye, Loader2, ChevronDown,
  Search, DollarSign, Award, Briefcase, BadgeCheck,
  Receipt, FileText, Printer, ExternalLink, Settings,
  UserPlus, List, ChevronUp
} from 'lucide-react'
import { getAllEmployees, getCompany, saveEmployee, deleteEmployee, bootstrapStorage } from '@/lib/storage-api'
import { type Employee, type CompanyConfig } from '@/lib/storage'
import { useToast } from '@/hooks/use-toast'

type View = 'payslip' | 'salary_cert' | 'appointment' | 'experience' | 'employment_cert' | 'employees' | 'employee_list' | 'settings'
type DocType = 'payslip' | 'salary_cert' | 'appointment' | 'experience' | 'employment_cert'

const DOC_TYPES: { key: DocType; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'payslip', label: 'Pay Slip', icon: <Receipt className="w-4 h-4" />, desc: 'Generate monthly pay slips' },
  { key: 'salary_cert', label: 'Salary Certificate', icon: <DollarSign className="w-4 h-4" />, desc: 'Salary verification letter' },
  { key: 'appointment', label: 'Appointment Letter', icon: <Briefcase className="w-4 h-4" />, desc: 'Employment offer letter' },
  { key: 'experience', label: 'Experience Letter', icon: <Award className="w-4 h-4" />, desc: 'Work experience proof' },
  { key: 'employment_cert', label: 'Employment Cert.', icon: <BadgeCheck className="w-4 h-4" />, desc: 'Current employment proof' },
]

const EMPTY_EMPLOYEE: Employee = {
  id: '', name: '', designation: '', department: '', joining_date: '',
  basic: 0, house_rent: 0, conveyance: 0, medical: 0, food_mobile: 0,
  cash: 0, gross: 0, tax: 0, net: 0, bank_account: '', bank_name: '',
  nid: '', mobile: '', email: '', status: 'active', ref_code: '',
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function buildDocData(docType: DocType, emp: Employee, overrides: Record<string, any> = {}): Record<string, any> {
  const base: Record<string, any> = { ...emp, ...overrides }
  base.employee_id = emp.id
  if (docType === 'payslip') {
    base.month = base.month || new Date().getMonth() + 1
    base.year = base.year || new Date().getFullYear()
    base.days_present = base.days_present || 30
    base.days_in_month = base.days_in_month || 30
  }
  if (docType === 'salary_cert' || docType === 'employment_cert') {
    base.cert_date = base.cert_date || new Date().toISOString().split('T')[0]
    base.purpose = base.purpose || 'official purposes'
  }
  if (docType === 'appointment') {
    base.letter_date = base.letter_date || emp.joining_date || new Date().toISOString().split('T')[0]
    base.probation_months = base.probation_months || 3
  }
  if (docType === 'experience') {
    base.leaving_date = base.leaving_date || new Date().toISOString().split('T')[0]
    base.letter_date = base.letter_date || base.leaving_date
  }
  return base
}

// ─── Collapsible Section Component ───
function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  )
}

export default function Home() {
  const [view, setView] = useState<View>('payslip')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [company, setCompany] = useState<CompanyConfig | null>(null)
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')
  const [previewSrc, setPreviewSrc] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [docxLoading, setDocxLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [docOverrides, setDocOverrides] = useState<Record<string, any>>({})
  const [empDialogOpen, setEmpDialogOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null)
  const [empForm, setEmpForm] = useState<Employee>({ ...EMPTY_EMPLOYEE })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [sidebarEmployeesOpen, setSidebarEmployeesOpen] = useState(true)
  const [sidebarDocsOpen, setSidebarDocsOpen] = useState(true)
  const { toast } = useToast()
  const prevBlobRef = useRef<string>('')

  useEffect(() => {
    const initialize = async () => {
      try {
        await bootstrapStorage()
        const [emps, co] = await Promise.all([getAllEmployees(), getCompany()])
        setEmployees(emps)
        setCompany(co)
        if (emps.length > 0) setSelectedEmpId(emps[0].id)
      } catch {
        toast({ title: 'Error', description: 'Failed to load employee data.', variant: 'destructive' })
      }
    }
    initialize()
  }, [toast])

  useEffect(() => {
    return () => {
      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current)
    }
  }, [])

  const currentEmp = employees.find(e => e.id === selectedEmpId)

  const fetchPreview = useCallback(async () => {
    if (!currentEmp) {
      setPreviewSrc(`/api/document?type=${view}`)
      return
    }
    try {
      const data = buildDocData(view as DocType, currentEmp, docOverrides)
      const res = await fetch('/api/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: view, data, company }),
      })
      if (res.ok) {
        const html = await res.text()
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current)
        prevBlobRef.current = url
        setPreviewSrc(url)
      }
    } catch {
      setPreviewSrc(`/api/document?type=${view}`)
    }
  }, [view, currentEmp, docOverrides, company])

  useEffect(() => { fetchPreview() }, [fetchPreview])

  const refreshEmployees = useCallback(async () => {
    const emps = await getAllEmployees()
    setEmployees(emps)
    if (emps.length > 0 && !emps.find(e => e.id === selectedEmpId)) {
      setSelectedEmpId(emps[0].id)
    } else if (emps.length === 0) {
      setSelectedEmpId('')
    }
  }, [selectedEmpId])

  const handleDownloadPDF = async () => {
    if (!currentEmp) return toast({ title: 'Error', description: 'Select an employee first.', variant: 'destructive' })
    setPdfLoading(true)
    try {
      const data = buildDocData(view as DocType, currentEmp, docOverrides)
      const htmlRes = await fetch('/api/document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: view, data, company }) })
      const htmlContent = await htmlRes.text()
      const pdfRes = await fetch('/api/generate-pdf', { method: 'POST', headers: { 'Content-Type': 'text/html' }, body: htmlContent })
      if (!pdfRes.ok) throw new Error('PDF failed')
      const blob = await pdfRes.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${DOC_TYPES.find(d => d.key === view)?.label || 'Document'}-${currentEmp.name}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Error', description: 'PDF generation failed.', variant: 'destructive' })
    } finally { setPdfLoading(false) }
  }

  const handleDownloadDOC = async () => {
    if (!currentEmp) return toast({ title: 'Error', description: 'Select an employee first.', variant: 'destructive' })
    setDocxLoading(true)
    try {
      const data = buildDocData(view as DocType, currentEmp, docOverrides)
      const htmlRes = await fetch('/api/document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: view, data, company }) })
      const htmlContent = await htmlRes.text()
      const docRes = await fetch('/api/generate-docx', { method: 'POST', headers: { 'Content-Type': 'text/html' }, body: htmlContent })
      if (!docRes.ok) throw new Error('DOC failed')
      const blob = await docRes.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${DOC_TYPES.find(d => d.key === view)?.label || 'Document'}-${currentEmp.name}.doc`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Error', description: 'DOC generation failed.', variant: 'destructive' })
    } finally { setDocxLoading(false) }
  }

  const handlePrint = () => {
    if (previewSrc) window.open(previewSrc, '_blank')
  }

  const openAddEmployee = () => {
    const nextId = `EMP${String(employees.length + 1).padStart(3, '0')}`
    setEditingEmp(null)
    setEmpForm({ ...EMPTY_EMPLOYEE, id: nextId, ref_code: `TBH-${Math.floor(10000 + Math.random() * 90000)}` })
    setEmpDialogOpen(true)
  }
  const openEditEmployee = (emp: Employee) => { setEditingEmp(emp); setEmpForm({ ...emp }); setEmpDialogOpen(true) }
  const handleSaveEmployee = async () => {
    if (!empForm.name.trim()) return toast({ title: 'Error', description: 'Name required.', variant: 'destructive' })
    if (!empForm.designation.trim()) return toast({ title: 'Error', description: 'Designation required.', variant: 'destructive' })
    const gross = (Number(empForm.basic)||0)+(Number(empForm.house_rent)||0)+(Number(empForm.conveyance)||0)+(Number(empForm.medical)||0)+(Number(empForm.food_mobile)||0)+(Number(empForm.cash)||0)
    const net = gross - (Number(empForm.tax)||0)
    try {
      await saveEmployee({ ...empForm, gross, net })
      await refreshEmployees()
      setEmpDialogOpen(false)
      toast({ title: 'Success', description: `Employee ${editingEmp ? 'updated' : 'added'}.` })
    } catch {
      toast({ title: 'Error', description: 'Failed to save employee.', variant: 'destructive' })
    }
  }
  const handleDeleteEmployee = async (id: string) => {
    try {
      await deleteEmployee(id)
      await refreshEmployees()
      setDeleteConfirm(null)
      toast({ title: 'Deleted', description: 'Employee removed.' })
    } catch {
      toast({ title: 'Error', description: 'Failed to delete employee.', variant: 'destructive' })
    }
  }
  const updateFormField = (field: keyof Employee, value: string | number) => setEmpForm(p => ({ ...p, [field]: value }))
  const calcGross = (Number(empForm.basic)||0)+(Number(empForm.house_rent)||0)+(Number(empForm.conveyance)||0)+(Number(empForm.medical)||0)+(Number(empForm.food_mobile)||0)+(Number(empForm.cash)||0)
  const calcNet = calcGross - (Number(empForm.tax)||0)
  const setOverride = (key: string, val: any) => setDocOverrides(p => ({ ...p, [key]: val }))

  const isDocView = ['payslip','salary_cert','appointment','experience','employment_cert'].includes(view)
  const activeDocMeta = DOC_TYPES.find(d => d.key === view)
  const filteredEmps = employees.filter(e => !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.ref_code.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {/* ═══ TOP HEADER BAR ═══ */}
      <header className="h-12 flex-shrink-0 bg-white border-b border-gray-200 flex items-center px-4 gap-0">
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5 w-52 flex-shrink-0">
          <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#FF2109' }}>
            <span className="text-white font-extrabold text-sm">B</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-[12px] font-bold text-gray-900 leading-tight truncate">Beyond Headlines</h1>
            <p className="text-[9px] text-gray-400 leading-tight">HR Document Generator</p>
          </div>
        </div>

        {/* Center: Document info */}
        {isDocView && activeDocMeta && (
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="flex items-center gap-2 text-gray-500">
              {activeDocMeta.icon}
              <span className="text-[13px] font-semibold text-gray-800">{activeDocMeta.label}</span>
            </div>
            <span className="text-[11px] text-gray-400">— {activeDocMeta.desc}</span>
          </div>
        )}
        {view === 'employees' && (
          <div className="flex-1 flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4 text-gray-500" />
            <span className="text-[13px] font-semibold text-gray-800">Add / Edit Employee</span>
          </div>
        )}
        {view === 'employee_list' && (
          <div className="flex-1 flex items-center justify-center gap-2">
            <List className="w-4 h-4 text-gray-500" />
            <span className="text-[13px] font-semibold text-gray-800">Employee List</span>
          </div>
        )}
        {view === 'settings' && (
          <div className="flex-1 flex items-center justify-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" />
            <span className="text-[13px] font-semibold text-gray-800">Company Settings</span>
          </div>
        )}

        {/* Right: Action buttons */}
        {isDocView && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button onClick={handleDownloadPDF} disabled={pdfLoading || docxLoading} variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 px-3">
              {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
            </Button>
            <Button onClick={handleDownloadDOC} disabled={pdfLoading || docxLoading} variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 px-3">
              {docxLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} DOC
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 px-3">
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button onClick={() => { if (previewSrc) window.open(previewSrc, '_blank') }} variant="ghost" size="sm" className="h-7 text-[11px] gap-1.5 px-2 text-gray-500">
              <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
            </Button>
          </div>
        )}
        {!isDocView && <div className="flex-1" />}
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ═══ LEFT SIDEBAR ═══ */}
        <aside className="w-56 flex-shrink-0 bg-gradient-to-b from-gray-50/80 to-white border-r border-gray-100 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="py-3 px-2 space-y-1">

              {/* EMPLOYEES Section */}
              <div className="mb-1">
                <button
                  onClick={() => setSidebarEmployeesOpen(!sidebarEmployeesOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100/60 transition-all duration-200"
                >
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em]">Employees</span>
                  <div className={`transition-transform duration-300 ease-out ${sidebarEmployeesOpen ? 'rotate-0' : '-rotate-90'}`}>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-out ${sidebarEmployeesOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="space-y-0.5 pt-0.5">
                    <button onClick={() => setView('employees')}
                      className={`group w-full px-3 py-2 text-left text-[12px] flex items-center gap-2.5 rounded-lg transition-all duration-200 relative overflow-hidden ${view === 'employees'
                        ? 'text-gray-900 font-semibold bg-white shadow-sm border border-gray-100/80'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-white/60 border border-transparent'}`}>
                      {view === 'employees' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: '#FF2109' }} />}
                      <UserPlus className={`w-4 h-4 transition-colors duration-200 ${view === 'employees' ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      <span>Add / Edit</span>
                    </button>
                    <button onClick={() => setView('employee_list')}
                      className={`group w-full px-3 py-2 text-left text-[12px] flex items-center gap-2.5 rounded-lg transition-all duration-200 relative overflow-hidden ${view === 'employee_list'
                        ? 'text-gray-900 font-semibold bg-white shadow-sm border border-gray-100/80'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-white/60 border border-transparent'}`}>
                      {view === 'employee_list' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: '#FF2109' }} />}
                      <List className={`w-4 h-4 transition-colors duration-200 ${view === 'employee_list' ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      <span>Employee List</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* DOCUMENTS Section */}
              <div className="mb-1">
                <button
                  onClick={() => setSidebarDocsOpen(!sidebarDocsOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100/60 transition-all duration-200"
                >
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em]">Documents</span>
                  <div className={`transition-transform duration-300 ease-out ${sidebarDocsOpen ? 'rotate-0' : '-rotate-90'}`}>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-out ${sidebarDocsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="space-y-0.5 pt-0.5">
                    {DOC_TYPES.map(doc => (
                      <button key={doc.key} onClick={() => { setView(doc.key); setDocOverrides({}) }}
                        className={`group w-full px-3 py-2 text-left text-[12px] flex items-center gap-2.5 rounded-lg transition-all duration-200 relative overflow-hidden ${view === doc.key
                          ? 'text-gray-900 font-semibold bg-white shadow-sm border border-gray-100/80'
                          : 'text-gray-500 hover:text-gray-800 hover:bg-white/60 border border-transparent'}`}>
                        {view === doc.key && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: '#FF2109' }} />}
                        <span className={`transition-colors duration-200 ${view === doc.key ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-600'}`}>{doc.icon}</span>
                        <span className="truncate">{doc.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-3 my-2 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              {/* SETTINGS */}
              <button onClick={() => setView('settings')}
                className={`group w-full px-3 py-2 text-left text-[12px] flex items-center gap-2.5 rounded-lg transition-all duration-200 relative overflow-hidden ${view === 'settings'
                  ? 'text-gray-900 font-semibold bg-white shadow-sm border border-gray-100/80'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-white/60 border border-transparent'}`}>
                {view === 'settings' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: '#FF2109' }} />}
                <Settings className={`w-4 h-4 transition-colors duration-200 ${view === 'settings' ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span>Settings</span>
              </button>

            </div>
          </ScrollArea>

          {/* Sidebar Footer - App version */}
          <div className="px-4 py-3 border-t border-gray-100/60 flex-shrink-0">
            <p className="text-[9px] text-gray-300 font-medium tracking-wider">v1.01 • TBH HR Docs</p>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="flex-1 flex overflow-hidden">

          {/* ═══ DOCUMENT VIEW ═══ */}
          {isDocView && (
            <>
              {/* Left Config Panel */}
              <div className="w-[360px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-3">
                    {/* Employee Select Section */}
                    <Section title="Employee">
                      <select value={selectedEmpId} onChange={e => { setSelectedEmpId(e.target.value); setDocOverrides({}) }}
                        className="w-full h-9 rounded-md border border-gray-200 px-3 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-red-200">
                        <option value="">-- Select Employee --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.id} — {emp.name}</option>
                        ))}
                      </select>
                    </Section>

                    {currentEmp && (
                      <>
                        {/* Employee Info Section */}
                        <Section title="Employee Info">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div>
                              <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Employee ID</Label>
                              <div className="text-[12px] font-semibold text-gray-900 mt-0.5 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">{currentEmp.ref_code || currentEmp.id}</div>
                            </div>
                            <div>
                              <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Name</Label>
                              <div className="text-[12px] font-semibold text-gray-900 mt-0.5 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">{currentEmp.name}</div>
                            </div>
                            <div>
                              <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Designation</Label>
                              <div className="text-[12px] font-semibold text-gray-900 mt-0.5 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">{currentEmp.designation}</div>
                            </div>
                            <div>
                              <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Department</Label>
                              <div className="text-[12px] font-semibold text-gray-900 mt-0.5 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">{currentEmp.department}</div>
                            </div>
                          </div>
                        </Section>

                        {/* Pay Period Section (payslip only) */}
                        {view === 'payslip' && (
                          <Section title="Pay Period">
                            <div className="space-y-2.5">
                              <div>
                                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Date</Label>
                                <Input type="date" value={docOverrides.date || new Date().toISOString().split('T')[0]} onChange={e => setOverride('date', e.target.value)} className="h-8 text-[12px] mt-0.5" />
                              </div>
                              <div>
                                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Ref Code</Label>
                                <div className="text-[12px] font-semibold text-gray-900 mt-0.5 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">{currentEmp.ref_code || currentEmp.id}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Month</Label>
                                  <select value={docOverrides.month || new Date().getMonth() + 1} onChange={e => setOverride('month', Number(e.target.value))} className="w-full h-8 rounded-md border border-gray-200 px-2 text-[12px] mt-0.5 bg-white">
                                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Year</Label>
                                  <Input type="number" value={docOverrides.year || new Date().getFullYear()} onChange={e => setOverride('year', Number(e.target.value))} className="h-8 text-[12px] mt-0.5" />
                                </div>
                              </div>
                            </div>
                          </Section>
                        )}

                        {/* Salary Cert Options */}
                        {view === 'salary_cert' && (
                          <Section title="Certificate Options">
                            <div className="space-y-2.5">
                              <div>
                                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Certificate Date</Label>
                                <Input type="date" value={docOverrides.cert_date || new Date().toISOString().split('T')[0]} onChange={e => setOverride('cert_date', e.target.value)} className="h-8 text-[12px] mt-0.5" />
                              </div>
                              <div>
                                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Purpose</Label>
                                <Input value={docOverrides.purpose || 'bank loan'} onChange={e => setOverride('purpose', e.target.value)} className="h-8 text-[12px] mt-0.5" placeholder="e.g. bank loan" />
                              </div>
                            </div>
                          </Section>
                        )}

                        {/* Appointment Options */}
                        {view === 'appointment' && (
                          <Section title="Letter Options">
                            <div className="space-y-2.5">
                              <div>
                                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Letter Date</Label>
                                <Input type="date" value={docOverrides.letter_date || currentEmp.joining_date} onChange={e => setOverride('letter_date', e.target.value)} className="h-8 text-[12px] mt-0.5" />
                              </div>
                              <div>
                                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Probation (months)</Label>
                                <Input type="number" value={docOverrides.probation_months || 3} onChange={e => setOverride('probation_months', Number(e.target.value))} className="h-8 text-[12px] mt-0.5" />
                              </div>
                            </div>
                          </Section>
                        )}

                        {/* Experience Options */}
                        {view === 'experience' && (
                          <Section title="Certificate Options">
                            <div className="space-y-2.5">
                              <div>
                                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Last Working Date</Label>
                                <Input type="date" value={docOverrides.leaving_date || ''} onChange={e => setOverride('leaving_date', e.target.value)} className="h-8 text-[12px] mt-0.5" />
                              </div>
                              <div>
                                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Letter Date</Label>
                                <Input type="date" value={docOverrides.letter_date || docOverrides.leaving_date || new Date().toISOString().split('T')[0]} onChange={e => setOverride('letter_date', e.target.value)} className="h-8 text-[12px] mt-0.5" />
                              </div>
                            </div>
                          </Section>
                        )}

                        {/* Employment Cert Options */}
                        {view === 'employment_cert' && (
                          <Section title="Certificate Options">
                            <div className="space-y-2.5">
                              <div>
                                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Certificate Date</Label>
                                <Input type="date" value={docOverrides.cert_date || new Date().toISOString().split('T')[0]} onChange={e => setOverride('cert_date', e.target.value)} className="h-8 text-[12px] mt-0.5" />
                              </div>
                              <div>
                                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Purpose</Label>
                                <Input value={docOverrides.purpose || 'visa application'} onChange={e => setOverride('purpose', e.target.value)} className="h-8 text-[12px] mt-0.5" placeholder="e.g. visa application" />
                              </div>
                            </div>
                          </Section>
                        )}

                        {/* Salary Summary */}
                        <Section title="Salary Summary">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[12px]"><span className="text-gray-500">Gross Salary</span><span className="font-semibold">৳{currentEmp.gross?.toLocaleString('en-IN') || '0'}</span></div>
                            <div className="flex justify-between text-[12px]"><span className="text-gray-500">Tax</span><span className="font-semibold">৳{currentEmp.tax?.toLocaleString('en-IN') || '0'}</span></div>
                            <Separator />
                            <div className="flex justify-between text-[12px]"><span className="font-semibold text-gray-700">Net Salary</span><span className="font-bold" style={{ color: '#FF2109' }}>৳{currentEmp.net?.toLocaleString('en-IN') || '0'}</span></div>
                          </div>
                        </Section>
                      </>
                    )}
                    {!currentEmp && (
                      <div className="text-center py-8">
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-[12px] text-gray-400">Select an employee to generate document</p>
                        <Button onClick={() => setView('employees')} variant="outline" size="sm" className="mt-3 gap-1 text-[11px]"><Plus className="w-3 h-3" /> Add Employee</Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right Preview Panel */}
              <div className="flex-1 bg-gray-100 flex flex-col overflow-hidden">
                <div className="h-9 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-[12px] font-semibold text-gray-700">Live Preview</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Updates as you type</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">55%</span>
                    <div className="flex gap-1">
                      <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 text-[11px] font-bold">−</button>
                      <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 text-[11px] font-bold">+</button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden p-4">
                  <div className="w-full h-full bg-white shadow-lg rounded overflow-hidden">
                    {previewSrc ? (
                      <iframe key={previewSrc} src={previewSrc} className="w-full h-full border-0" title="Preview" sandbox="allow-same-origin" style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '181.8%', height: '181.8%' }} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300 text-sm">Loading preview...</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══ EMPLOYEES ADD/EDIT VIEW ═══ */}
          {view === 'employees' && (
            <div className="flex-1 bg-white flex flex-col overflow-hidden">
              <div className="h-12 border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
                <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2"><UserPlus className="w-4 h-4" style={{ color: '#FF2109' }} />Add / Edit Employee</h2>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6 max-w-2xl">
                  {employees.length > 0 && (
                    <div className="mb-6">
                      <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Select Employee to Edit</Label>
                      <div className="mt-2 space-y-1">
                        {employees.map(emp => (
                          <div key={emp.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold text-gray-900">{emp.name}</p>
                              <p className="text-[11px] text-gray-500">{emp.designation} • {emp.department} • {emp.ref_code || emp.id}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <Button onClick={() => openEditEmployee(emp)} variant="outline" size="sm" className="h-7 text-[11px] gap-1"><Pencil className="w-3 h-3" /> Edit</Button>
                              <Button onClick={() => setDeleteConfirm(emp.id)} variant="ghost" size="sm" className="h-7 text-[11px] text-red-500 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button onClick={openAddEmployee} className="gap-2 text-white h-9" style={{ background: '#FF2109' }}><Plus className="w-4 h-4" /> Add New Employee</Button>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* ═══ EMPLOYEE LIST VIEW ═══ */}
          {view === 'employee_list' && (
            <div className="flex-1 bg-white flex flex-col overflow-hidden">
              <div className="h-12 border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
                <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2"><List className="w-4 h-4" style={{ color: '#FF2109' }} />Employee Directory<span className="text-[11px] font-normal text-gray-400">({employees.length})</span></h2>
                <div className="flex items-center gap-3">
                  <div className="relative"><Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="h-7 w-44 pl-7 text-[11px]" /></div>
                  <Button onClick={openAddEmployee} className="gap-1.5 text-white h-7 text-[11px]" style={{ background: '#FF2109' }}><Plus className="w-3 h-3" /> Add</Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                {filteredEmps.length === 0 ? (
                  <div className="text-center py-20"><Users className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">{searchQuery ? 'No matching employees' : 'No employees yet'}</p></div>
                ) : (
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Designation</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="text-right px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Net Salary</th>
                        <th className="text-center px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="text-right px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmps.map(emp => (
                        <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-gray-900">{emp.name}</td>
                          <td className="px-4 py-2.5 text-gray-600 font-mono text-[11px]">{emp.ref_code || emp.id}</td>
                          <td className="px-4 py-2.5 text-gray-600">{emp.designation}</td>
                          <td className="px-4 py-2.5 text-gray-600">{emp.department}</td>
                          <td className="px-4 py-2.5 text-right font-bold" style={{ color: '#FF2109' }}>৳{emp.net?.toLocaleString('en-IN') || '0'}</td>
                          <td className="px-4 py-2.5 text-center"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">{emp.status || 'active'}</span></td>
                          <td className="px-4 py-2.5 text-right">
                            <button onClick={() => openEditEmployee(emp)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Edit"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => setDeleteConfirm(emp.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete"><Trash2 className="w-3 h-3" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </ScrollArea>
            </div>
          )}

          {/* ═══ SETTINGS VIEW ═══ */}
          {view === 'settings' && company && (
            <div className="flex-1 bg-white flex flex-col overflow-hidden">
              <div className="h-12 border-b border-gray-100 flex items-center px-6 flex-shrink-0">
                <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2"><Building2 className="w-4 h-4" style={{ color: '#FF2109' }} />Company Information</h2>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6 max-w-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div><label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Company Name</label><p className="text-[13px] text-gray-900 font-semibold mt-1">{company.name}</p></div>
                    <div><label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Proprietor</label><p className="text-[13px] text-gray-900 font-semibold mt-1">{company.proprietor_name}</p></div>
                    <div className="sm:col-span-2"><label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Office Address</label><p className="text-[13px] text-gray-900 mt-1">{company.address}</p></div>
                    <div><label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Phone</label><p className="text-[13px] text-gray-900 mt-1">{company.phone || 'Not set'}</p></div>
                    <div><label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Email</label><p className="text-[13px] text-gray-900 mt-1">{company.email || 'Not set'}</p></div>
                    <div><label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Brand Color</label><div className="flex items-center gap-2 mt-1"><div className="w-5 h-5 rounded border border-gray-200" style={{ background: company.brand_color }} /><p className="text-[13px] text-gray-900 font-mono">{company.brand_color}</p></div></div>
                    <div><label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Proprietor Designation</label><p className="text-[13px] text-gray-900 mt-1">{company.proprietor_designation}</p></div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* ═══ ADD/EDIT EMPLOYEE DIALOG ═══ */}
      <Dialog open={empDialogOpen} onOpenChange={setEmpDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5" style={{ color: '#FF2109' }} />{editingEmp ? 'Edit Employee' : 'Add New Employee'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5"><Label className="text-xs">Full Name *</Label><Input value={empForm.name} onChange={e => updateFormField('name', e.target.value)} placeholder="e.g. Syed Ashfaqul Haque" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Reference Code</Label><Input value={empForm.ref_code} onChange={e => updateFormField('ref_code', e.target.value)} placeholder="e.g. TBH-46077" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Designation *</Label><Input value={empForm.designation} onChange={e => updateFormField('designation', e.target.value)} placeholder="e.g. Editor" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Department *</Label><Input value={empForm.department} onChange={e => updateFormField('department', e.target.value)} placeholder="e.g. Editorial" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Joining Date</Label><Input type="date" value={empForm.joining_date} onChange={e => updateFormField('joining_date', e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Status</Label><select value={empForm.status} onChange={e => updateFormField('status', e.target.value)} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm bg-white"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            <div className="sm:col-span-2 mt-1"><h4 className="text-xs font-semibold text-gray-600 flex items-center gap-2"><span className="w-1 h-1 rounded-full" style={{ background: '#FF2109' }} />Salary Components (BDT/month)</h4></div>
            <div className="space-y-1.5"><Label className="text-xs">Basic Salary</Label><Input type="number" value={empForm.basic || ''} onChange={e => updateFormField('basic', Number(e.target.value))} placeholder="0" /></div>
            <div className="space-y-1.5"><Label className="text-xs">House Rent</Label><Input type="number" value={empForm.house_rent || ''} onChange={e => updateFormField('house_rent', Number(e.target.value))} placeholder="0" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Conveyance</Label><Input type="number" value={empForm.conveyance || ''} onChange={e => updateFormField('conveyance', Number(e.target.value))} placeholder="0" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Medical</Label><Input type="number" value={empForm.medical || ''} onChange={e => updateFormField('medical', Number(e.target.value))} placeholder="0" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Food & Mobile</Label><Input type="number" value={empForm.food_mobile || ''} onChange={e => updateFormField('food_mobile', Number(e.target.value))} placeholder="0" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Cash</Label><Input type="number" value={empForm.cash || ''} onChange={e => updateFormField('cash', Number(e.target.value))} placeholder="0" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Tax Deduction</Label><Input type="number" value={empForm.tax || ''} onChange={e => updateFormField('tax', Number(e.target.value))} placeholder="0" /></div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-100 space-y-1">
              <div className="text-[10px] text-gray-500 font-medium">Auto-Calculated</div>
              <div className="flex justify-between"><span className="text-xs font-semibold text-gray-700">Gross:</span><span className="text-xs font-bold text-gray-900">৳{calcGross.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-xs font-semibold text-gray-700">Net:</span><span className="text-xs font-bold" style={{ color: '#FF2109' }}>৳{calcNet.toLocaleString('en-IN')}</span></div>
            </div>
            <div className="sm:col-span-2 mt-1"><h4 className="text-xs font-semibold text-gray-600 flex items-center gap-2"><span className="w-1 h-1 rounded-full" style={{ background: '#FF2109' }} />Contact & Banking</h4></div>
            <div className="space-y-1.5"><Label className="text-xs">Mobile</Label><Input value={empForm.mobile} onChange={e => updateFormField('mobile', e.target.value)} placeholder="+880..." /></div>
            <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" value={empForm.email} onChange={e => updateFormField('email', e.target.value)} placeholder="name@company.com" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Bank Name</Label><Input value={empForm.bank_name} onChange={e => updateFormField('bank_name', e.target.value)} placeholder="e.g. BRAC Bank" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Bank Account</Label><Input value={empForm.bank_account} onChange={e => updateFormField('bank_account', e.target.value)} placeholder="e.g. 0012-3456-7890" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">NID Number</Label><Input value={empForm.nid} onChange={e => updateFormField('nid', e.target.value)} placeholder="National ID" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEmployee} className="text-white" style={{ background: '#FF2109' }}>{editingEmp ? 'Update' : 'Add Employee'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Employee</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDeleteEmployee(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
