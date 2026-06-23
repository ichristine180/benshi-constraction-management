/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatCurrency, formatDate } from './index'
import { Timestamp } from 'firebase/firestore'

export async function exportToExcel(data: any[], filename: string, sheetName = 'Report') {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export async function exportFinancialReportPDF(reportData: {
  totalFunds: number
  totalSpent: number
  remaining: number
  categoryBreakdown: { category: string; amount: number }[]
  transactions: any[]
}) {
  const jsPDF = (await import('jspdf')).default
  await import('jspdf-autotable')

  const doc = new jsPDF() as any
  const pageWidth = doc.internal.pageSize.width

  doc.setFontSize(20)
  doc.setTextColor(30, 64, 175)
  doc.text('Construction Financial Report', pageWidth / 2, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' })

  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Financial Summary', 14, 42)

  doc.autoTable({
    startY: 46,
    head: [['Item', 'Amount']],
    body: [
      ['Total Funds Received', formatCurrency(reportData.totalFunds)],
      ['Total Spent', formatCurrency(reportData.totalSpent)],
      ['Remaining Balance', formatCurrency(reportData.remaining)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
  })

  const y1 = doc.lastAutoTable.finalY + 10
  doc.setFontSize(14)
  doc.text('Spending by Category', 14, y1)

  doc.autoTable({
    startY: y1 + 4,
    head: [['Category', 'Amount Spent']],
    body: reportData.categoryBreakdown.map(c => [c.category, formatCurrency(c.amount)]),
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
  })

  doc.save('financial-report.pdf')
}

export async function exportAttendanceReportExcel(
  attendanceData: any[],
  workers: any[],
  month: string
) {
  const rows = workers.map(w => {
    const workerAttendance = attendanceData.filter(a => a.workerId === w.id)
    const present = workerAttendance.filter(a => a.status === 'present').length
    const halfDay = workerAttendance.filter(a => a.status === 'half_day').length
    const absent = workerAttendance.filter(a => a.status === 'absent').length
    const workedDays = present + halfDay * 0.5
    const earned = workedDays * w.dailyRate

    return {
      Name: w.fullName,
      Role: w.role,
      'Present Days': present,
      'Half Days': halfDay,
      'Absent Days': absent,
      'Total Worked Days': workedDays,
      'Daily Rate (RWF)': w.dailyRate,
      'Total Earned (RWF)': earned,
    }
  })

  await exportToExcel(rows, `attendance-${month}`, 'Attendance')
}
