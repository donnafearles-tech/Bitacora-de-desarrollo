import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { LogEntry } from '../types';

export function exportToExcel(entries: LogEntry[], filename = 'devlog_registros.xlsx') {
  const rows = entries.map(e => ({
    'ID': e.id,
    'Fecha': e.date,
    'Proyecto': e.project || 'General',
    'Resumen': e.summary,
    'Horas Dedicadas': e.timeSpentHours || 0,
    'Estado / Mood': e.mood || 'productive',
    'Etiquetas': e.tags.join(', '),
    'Actividades': e.activities,
    'Obstáculos / Bugs': e.obstacles,
    'Soluciones': e.solutions,
    'Plan Siguiente': e.plan,
    'Creado': e.created_at || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 10 }, // ID
    { wch: 12 }, // Fecha
    { wch: 18 }, // Proyecto
    { wch: 35 }, // Resumen
    { wch: 14 }, // Horas
    { wch: 14 }, // Mood
    { wch: 25 }, // Tags
    { wch: 45 }, // Actividades
    { wch: 35 }, // Obstáculos
    { wch: 35 }, // Soluciones
    { wch: 30 }, // Plan
    { wch: 20 }, // Creado
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bitácora Dev');
  XLSX.writeFile(workbook, filename);
}

export function exportToMarkdown(entries: LogEntry[], filename = 'devlog_reporte.md') {
  let md = `# 📘 DevLog Pro - Bitácora de Ingeniería y Programación\n\n`;
  md += `*Generado el: ${new Date().toLocaleString()}*  \n`;
  md += `*Total de registros: ${entries.length}*  \n\n`;
  md += `---\n\n`;

  entries.forEach((e, idx) => {
    md += `## [${idx + 1}] ${e.date} — ${e.summary}\n\n`;
    md += `- **Proyecto:** \`${e.project || 'General'}\`\n`;
    md += `- **Tiempo:** \`${e.timeSpentHours}h\` | **Mood:** \`${e.mood || 'normal'}\`\n`;
    md += `- **Tags:** ${e.tags.map(t => `\`#${t}\``).join(' ')}\n\n`;
    
    md += `### 🧠 Actividades\n${e.activities}\n\n`;
    
    if (e.obstacles) {
      md += `### ⚠️ Obstáculos / Bugs\n${e.obstacles}\n\n`;
    }
    if (e.solutions) {
      md += `### 💡 Soluciones Aplicadas\n${e.solutions}\n\n`;
    }
    if (e.plan) {
      md += `### 🎯 Plan / Siguientes Pasos\n${e.plan}\n\n`;
    }
    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export function exportToPdf(entries: LogEntry[], filename = 'devlog_informe.pdf') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Header Banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('DEVLOG PRO — INFORME DE ACTIVIDAD TÉCNICA', margin, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Fecha de exportación: ${new Date().toLocaleDateString()} | Registros: ${entries.length}`, margin, 22);

  y = 36;

  // Summary Metrics Banner
  const totalHours = entries.reduce((acc, e) => acc + (e.timeSpentHours || 0), 0);
  const uniqueProjects = Array.from(new Set(entries.map(e => e.project || 'General'))).length;
  
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Horas: ${totalHours}h`, margin + 5, y + 9);
  doc.text(`Proyectos Activos: ${uniqueProjects}`, margin + 50, y + 9);
  doc.text(`Período: ${entries[entries.length - 1]?.date || ''} al ${entries[0]?.date || ''}`, margin + 105, y + 9);

  y += 22;

  entries.forEach((e, idx) => {
    // Check page overflow
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Entry Box Header
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`[${e.date}] ${e.project ? `[${e.project}] ` : ''}${e.summary.substring(0, 60)}`, margin + 3, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${e.timeSpentHours || 0}h | #${e.tags.slice(0, 4).join(' #')}`, pageWidth - margin - 50, y + 5.5);

    y += 11;

    // Activities
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const cleanAct = e.activities.replace(/[#*`_]/g, '');
    const actLines = doc.splitTextToSize(`Actividades: ${cleanAct}`, contentWidth - 6);
    doc.text(actLines, margin + 3, y);
    y += actLines.length * 4 + 2;

    // Obstacles & Solutions if present
    if (e.obstacles || e.solutions) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(180, 83, 9); // amber-700
      if (e.obstacles) {
        const obsLines = doc.splitTextToSize(`⚠️ Obstáculo: ${e.obstacles}`, contentWidth - 6);
        doc.text(obsLines, margin + 3, y);
        y += obsLines.length * 4 + 1;
      }
      if (e.solutions) {
        doc.setTextColor(21, 128, 61); // green-700
        const solLines = doc.splitTextToSize(`💡 Solución: ${e.solutions}`, contentWidth - 6);
        doc.text(solLines, margin + 3, y);
        y += solLines.length * 4 + 2;
      }
    }

    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  });

  doc.save(filename);
}
