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

// -------------------------------------------------------------
// ATLAS.TI CODEBOOK EXPORT (STRICT 2-COLUMN CSV FORMAT: Code;Comment)
// -------------------------------------------------------------
export function exportCodebookForAtlasTi(
  entries: LogEntry[],
  filename = 'atlas_ti_codebook.csv'
) {
  interface TagMeta {
    name: string;
    ocurrencias: number;
    proyectos: Set<string>;
    descriptions: Set<string>;
  }

  // 1. Extraer todas las etiquetas únicas y calcular métricas consolidadas
  const uniqueTagsMap = new Map<string, TagMeta>();

  entries.forEach(entry => {
    const proyecto = entry.project && entry.project.trim().length > 0 ? entry.project.trim() : 'General';
    if (Array.isArray(entry.tags)) {
      entry.tags.forEach(tag => {
        if (!tag || typeof tag !== 'string') return;
        const cleanTag = tag.trim();
        if (cleanTag.length === 0) return;

        const normalizedKey = cleanTag.toLowerCase();
        const desc =
          entry.tagDescriptions?.[cleanTag] ||
          entry.tagDescriptions?.[tag] ||
          '';

        if (!uniqueTagsMap.has(normalizedKey)) {
          uniqueTagsMap.set(normalizedKey, {
            name: cleanTag,
            ocurrencias: 1,
            proyectos: new Set([proyecto]),
            descriptions: new Set(desc ? [desc.trim()] : []),
          });
        } else {
          const item = uniqueTagsMap.get(normalizedKey)!;
          item.ocurrencias += 1;
          item.proyectos.add(proyecto);
          if (desc && desc.trim()) {
            item.descriptions.add(desc.trim());
          }
        }
      });
    }
  });

  // 2. Ordenar las etiquetas alfabéticamente
  const uniqueTags = Array.from(uniqueTagsMap.values())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  // Función de escape estricta para CSV con delimitador punto y coma (;)
  const cleanField = (text: string | null | undefined): string => {
    if (text === null || text === undefined) return '';
    // Reemplazar saltos de línea para mantener 1 fila exacta por tag
    const str = String(text).trim().replace(/[\r\n]+/g, ' ');
    if (str.includes(';') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // 3. Encabezado estricto: EXACTAMENTE dos columnas
  const csvLines: string[] = ['Code;Comment'];

  // 4. Generar cada fila: EXACTAMENTE dos valores separados por punto y coma (;)
  uniqueTags.forEach(tag => {
    const isComposite = tag.name.includes(':');
    const proyectosStr = Array.from(tag.proyectos).filter(Boolean).join(', ') || 'General';
    const descArray = Array.from(tag.descriptions).filter(Boolean);
    
    // EL TEXTO DEL COMENTARIO CONSOLIDADO (Toda la información va dentro de esta única columna)
    let comentarioConsolidado = '';
    if (isComposite) {
      const parts = tag.name.split(':');
      const categoria = parts[0].trim();
      const subconcepto = parts.slice(1).join(':').trim();
      
      const descripcion = descArray.length > 0
        ? descArray.join(' // ')
        : `Se refiere al desarrollo y resolución técnica de ${subconcepto.replace(/_/g, ' ')} en ${categoria}.`;

      comentarioConsolidado = `Descripción: ${descripcion} | Categoría: ${categoria} | Subconcepto: ${subconcepto} | Ocurrencias: ${tag.ocurrencias} | Proyectos: ${proyectosStr}`;
    } else {
      const descripcion = descArray.length > 0 ? descArray.join(' // ') : '';
      if (descripcion) {
        comentarioConsolidado = `Descripción: ${descripcion} | Categoría: ${tag.name} | Ocurrencias: ${tag.ocurrencias} | Proyectos: ${proyectosStr}`;
      } else {
        comentarioConsolidado = `Etiqueta base: ${tag.name} | Ocurrencias: ${tag.ocurrencias} | Proyectos: ${proyectosStr}`;
      }
    }

    // LA LÍNEA FINAL PARA EL CSV (SOLO DOS VALORES SEPARADOS POR ;)
    const code = cleanField(tag.name);
    const comment = cleanField(comentarioConsolidado);
    const lineaCsv = `${code};${comment}`;

    csvLines.push(lineaCsv);
  });

  // 5. Generar archivo descargable con BOM UTF-8 (\uFEFF)
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

