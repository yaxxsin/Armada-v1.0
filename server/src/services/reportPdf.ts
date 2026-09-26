import PDFDocument from 'pdfkit';
import type { buildReport } from './reportService.ts';
import {
  complianceText,
  daysLabel,
  formatDate,
  formatNumber,
  formatTimestamp,
} from './reportFormat.ts';

type Report = Awaited<ReturnType<typeof buildReport>>;

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 40;

const COLORS = {
  ink: '#111111',
  body: '#333333',
  dim: '#6b7280',
  faint: '#9ca3af',
  line: '#e5e7eb',
  panel: '#f6f7f9',
  navy: '#1f2937',
  lime: '#a3e635',
  ok: '#15803d',
  okBg: '#dcfce7',
  amber: '#b45309',
  amberBg: '#fef3c7',
  red: '#b91c1c',
  redBg: '#fee2e2',
  white: '#ffffff',
};

type Tone = 'ok' | 'amber' | 'red' | 'none';

function toneColors(tone: Tone) {
  switch (tone) {
    case 'red':
      return { text: COLORS.red, bg: COLORS.redBg };
    case 'amber':
      return { text: COLORS.amber, bg: COLORS.amberBg };
    case 'none':
      return { text: COLORS.dim, bg: COLORS.panel };
    default:
      return { text: COLORS.ok, bg: COLORS.okBg };
  }
}

class PdfReport {
  doc: PDFKit.PDFDocument;
  report: Report;
  pageNumber = 0;
  private readonly contentWidth = A4.width - MARGIN * 2;

  constructor(report: Report) {
    this.report = report;
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: `Laporan Armada 104 Group - ${formatDate(report.generatedAt)}`,
        Author: 'Armada Control 104 Group',
        Subject: 'Laporan kepatuhan dan status armada',
        Creator: 'Armada Control',
      },
    });
  }

  stream() {
    return this.doc;
  }

  private drawPageHeader() {
    const { doc } = this;
    doc
      .rect(0, 0, A4.width, 6)
      .fill(COLORS.navy);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.ink)
      .text('ARMADA CONTROL', MARGIN, MARGIN);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.faint)
      .text('104 GROUP', MARGIN, MARGIN + 11);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.dim)
      .text(
        `Dibuat ${formatTimestamp(this.report.generatedAt)}`,
        MARGIN,
        MARGIN,
        { width: this.contentWidth, align: 'right' }
      );
    doc
      .moveTo(MARGIN, MARGIN + 26)
      .lineTo(A4.width - MARGIN, MARGIN + 26)
      .lineWidth(0.5)
      .strokeColor(COLORS.line)
      .stroke();
    this.doc.y = MARGIN + 38;
  }

  private drawPageFooter() {
    const { doc } = this;
    const range = doc.bufferedPageRange();
    // Stay above the bottom margin: PDFKit silently starts a new page whenever
    // text is written past `maxY`, which would double every page.
    const y = A4.height - MARGIN - 14;
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc
        .moveTo(MARGIN, y - 8)
        .lineTo(A4.width - MARGIN, y - 8)
        .lineWidth(0.5)
        .strokeColor(COLORS.line)
        .stroke();
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(COLORS.faint)
        .text('Armada Control 104 Group - Laporan internal', MARGIN, y, {
          width: this.contentWidth / 2,
          align: 'left',
          lineBreak: false,
        });
      doc.text(`Halaman ${i - range.start + 1} dari ${range.count}`, MARGIN, y, {
        width: this.contentWidth,
        align: 'right',
        lineBreak: false,
      });
    }
  }

  private ensureSpace(height) {
    if (this.doc.y + height > A4.height - MARGIN - 24) {
      this.doc.addPage();
      this.drawPageHeader();
      this.doc.y = MARGIN + 38;
    }
  }

  private sectionTitle(title, subtitle) {
    this.ensureSpace(46);
    const { doc } = this;
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.ink).text(title, MARGIN, doc.y);
    doc.y += 2;
    if (subtitle) {
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.dim).text(subtitle, MARGIN, doc.y);
    }
    doc.y += 8;
    doc
      .rect(MARGIN, doc.y, 32, 2)
      .fill(COLORS.lime);
    doc.y += 12;
  }

  coverPage() {
    const { doc } = this;
    this.pageNumber += 1;
    doc.rect(0, 0, A4.width, A4.height).fill(COLORS.white);
    doc.rect(0, 0, A4.width, 8).fill(COLORS.navy);

    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink).text('ARMADA CONTROL 104 GROUP', MARGIN, 150);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.dim).text('Sistem Manajemen Armada & Kepatuhan Kendaraan', MARGIN, 164);
    doc.rect(MARGIN, 190, 56, 3).fill(COLORS.lime);

    doc.font('Helvetica-Bold').fontSize(30).fillColor(COLORS.ink).text('Laporan Armada', MARGIN, 214);
    doc.font('Helvetica-Bold').fontSize(30).fillColor(COLORS.dim).text('Periode ' + formatDate(this.report.generatedAt), MARGIN, 250);

    doc.font('Helvetica').fontSize(10).fillColor(COLORS.body);
    doc.text(
      `Laporan mencakup ${formatNumber(this.report.totals.laporanJumlah)} dari ${formatNumber(this.report.totals.armadaTotal)} kendaraan pada ${formatNumber(this.report.totals.lokasiTerpakai)} lokasi.`,
      MARGIN,
      300,
      { width: 420, lineGap: 4 }
    );

    const cards = [
      { label: 'Aman', value: this.report.summary.ok, tone: 'ok' as Tone },
      { label: 'Perlu Perhatian', value: this.report.summary.amber, tone: 'amber' as Tone },
      { label: 'Terlambat', value: this.report.summary.red, tone: 'red' as Tone },
    ];
    const cardWidth = (this.contentWidth - 24) / 3;
    cards.forEach((card, index) => {
      const x = MARGIN + index * (cardWidth + 12);
      const y = 350;
      const colors = toneColors(card.tone);
      doc.roundedRect(x, y, cardWidth, 66, 6).fill(colors.bg);
      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor(colors.text)
        .text(String(card.value), x + 14, y + 14, { width: cardWidth - 28 });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.text)
        .text(card.label.toUpperCase(), x + 14, y + 44, { width: cardWidth - 28, characterSpacing: 0.5 });
    });

    const meta = [
      ['Tanggal laporan', formatDate(this.report.generatedAt)],
      ['Waktu dibuat', formatTimestamp(this.report.generatedAt)],
      ['Filter lokasi', this.report.filters.lokasi === 'all' ? 'Semua lokasi' : this.report.filters.lokasi],
      ['Filter status', this.report.filters.scope === 'all' ? 'Semua status' : this.report.filters.scope],
      ['Urutan data', this.report.filters.sort],
      ['Total foto terlampir', formatNumber(this.report.summary.totalPhotos)],
    ];
    let y = 450;
    for (const [label, value] of meta) {
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.dim).text(label, MARGIN, y, { width: 160 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.ink).text(String(value), MARGIN + 165, y);
      doc
        .moveTo(MARGIN, y + 13)
        .lineTo(A4.width - MARGIN, y + 13)
        .lineWidth(0.5)
        .strokeColor(COLORS.line)
        .stroke();
      y += 20;
    }

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(COLORS.faint)
      .text(
        'Dokumen ini dibuat otomatis oleh sistem dan bersifat internal. Data kendaraan bersifat rahasia dan hanya untuk keperluan operasional 104 Group.',
        MARGIN,
        A4.height - 90,
        { width: this.contentWidth, align: 'left' }
      );
  }

  summaryPage() {
    const { doc } = this;
    doc.addPage();
    this.drawPageHeader();
    this.sectionTitle('Ringkasan Eksekutif', 'Distribusi status kepatuhan dan kondisi armada');

    const cards = [
      { label: 'Total Kendaraan', value: this.report.summary.total, tone: 'none' as Tone },
      { label: 'Total Odometer', value: `${formatNumber(this.report.summary.totalOdometer)} km`, tone: 'none' as Tone },
      { label: 'Total Biaya Servis', value: `Rp ${formatNumber(this.report.summary.totalServiceCost)}`, tone: 'none' as Tone },
      { label: 'Total Foto', value: this.report.summary.totalPhotos, tone: 'none' as Tone },
    ];
    const cardWidth = (this.contentWidth - 12) / 2;
    cards.forEach((card, index) => {
      const x = MARGIN + (index % 2) * (cardWidth + 12);
      const y = doc.y + Math.floor(index / 2) * 46;
      doc.roundedRect(x, y, cardWidth, 38, 5).fill(COLORS.panel);
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.faint).text(card.label.toUpperCase(), x + 12, y + 9, { width: cardWidth - 24, characterSpacing: 0.4 });
      doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.ink).text(String(card.value), x + 12, y + 20, { width: cardWidth - 24 });
    });
    doc.y += 100;

    this.sectionTitle('Kepatuhan Per Aspek', 'Jumlah kendaraan yang memerlukan tindakan');

    const compliance = [
      { label: 'Pajak Tahunan', total: this.report.summary.duePajakTahunan },
      { label: 'Pajak 5 Tahun', total: this.report.summary.duePajak5Tahunan },
      { label: 'KEUR', total: this.report.summary.dueKeur },
      { label: 'Servis', total: this.report.summary.dueService },
    ];
    const maxValue = Math.max(1, ...compliance.map((item) => item.total));
    for (const item of compliance) {
      this.ensureSpace(26);
      const barY = doc.y + 12;
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.body).text(item.label, MARGIN, doc.y, { width: 130 });
      const barX = MARGIN + 140;
      const barWidth = this.contentWidth - 140 - 40;
      doc.roundedRect(barX, barY, barWidth, 8, 4).fill(COLORS.panel);
      const filled = (item.total / maxValue) * barWidth;
      doc
        .roundedRect(barX, barY, Math.max(filled, item.total > 0 ? 6 : 0), 8, 4)
        .fill(item.total > 0 ? COLORS.amber : COLORS.ok);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.ink)
        .text(String(item.total), MARGIN + this.contentWidth - 32, doc.y, { width: 32, align: 'right' });
      doc.y += 24;
    }

    doc.y += 6;
    this.breakdownTable();
  }

  breakdownTable() {
    const { doc } = this;
    this.sectionTitle('Ringkasan per Lokasi', 'Status kepatuhan tiap lokasi');
    const columns = [
      { label: 'Lokasi', width: 150, align: 'left' as const },
      { label: 'Total', width: 45, align: 'right' as const },
      { label: 'Aman', width: 45, align: 'right' as const },
      { label: 'Perhatian', width: 70, align: 'right' as const },
      { label: 'Terlambat', width: 65, align: 'right' as const },
      { label: 'Odometer', width: 70, align: 'right' as const },
      { label: 'Biaya Servis', width: 100, align: 'right' as const },
    ];
    const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);

    this.drawTableHeader(columns, tableWidth);
    for (const item of this.report.breakdown) {
      this.ensureSpace(20);
      const rowY = doc.y;
      const cells = [
        item.lokasi,
        String(item.total),
        String(item.ok),
        String(item.amber),
        String(item.red),
        `${formatNumber(item.totalOdometer)} km`,
        `Rp ${formatNumber(item.totalServiceCost)}`,
      ];
      this.drawRow(cells, columns, tableWidth, rowY, (index) => {
        if (index === 3) return item.amber > 0 ? COLORS.amber : COLORS.dim;
        if (index === 4) return item.red > 0 ? COLORS.red : COLORS.dim;
        return COLORS.body;
      });
    }
    doc.y += 12;
  }

  private drawTableHeader(columns, tableWidth) {
    const { doc } = this;
    this.ensureSpace(24);
    const y = doc.y;
    doc.rect(MARGIN, y, tableWidth, 18).fill(COLORS.navy);
    let x = MARGIN;
    for (const column of columns) {
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor(COLORS.white)
        .text(column.label.toUpperCase(), x + 5, y + 6, { width: column.width - 10, align: column.align });
      x += column.width;
    }
    doc.y = y + 18;
  }

  private drawRow(cells, columns, tableWidth, rowY, colorFor?) {
    const { doc } = this;
    if (doc.y !== rowY) rowY = doc.y;
    doc.rect(MARGIN, rowY, tableWidth, 17).fill(COLORS.panel);
    let x = MARGIN;
    cells.forEach((cell, index) => {
      const column = columns[index];
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(colorFor ? colorFor(index) : COLORS.body)
        .text(String(cell), x + 5, rowY + 5, { width: column.width - 10, align: column.align, ellipsis: true });
      x += column.width;
    });
    doc
      .moveTo(MARGIN, rowY + 17)
      .lineTo(MARGIN + tableWidth, rowY + 17)
      .lineWidth(0.5)
      .strokeColor(COLORS.line)
      .stroke();
    doc.y = rowY + 17;
  }

  vehiclePages() {
    const { doc } = this;
    doc.addPage();
    this.drawPageHeader();
    this.sectionTitle(
      'Rincian Kendaraan',
      `${formatNumber(this.report.rows.length)} kendaraan dalam laporan`
    );

    const columns = [
      { label: 'Plat', width: 80, align: 'left' as const },
      { label: 'Merk', width: 95, align: 'left' as const },
      { label: 'Lokasi', width: 70, align: 'left' as const },
      { label: 'PIC', width: 65, align: 'left' as const },
      { label: 'Pajak Th', width: 52, align: 'right' as const },
      { label: 'Pajak 5Th', width: 52, align: 'right' as const },
      { label: 'Keur', width: 52, align: 'right' as const },
      { label: 'Odo (km)', width: 58, align: 'right' as const },
      { label: 'Status', width: 51, align: 'right' as const },
    ];
    const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);

    this.drawTableHeader(columns, tableWidth);
    for (const row of this.report.rows) {
      this.ensureSpace(20);
      const cells = [
        row.plat || '-',
        row.merk || '-',
        row.lokasi || '-',
        row.pic || '-',
        formatDate(row.pajakTahunanBerlaku),
        formatDate(row.pajak5TahunanBerlaku),
        formatDate(row.keurBerlaku),
        formatNumber(row.kmSekarang),
        row.overallStatusText,
      ];
      const colors = toneColors(row.overallStatus);
      this.drawRow(cells, columns, tableWidth, doc.y, (index) => {
        if (index === 8) return colors.text;
        if (index >= 4 && index <= 6) {
          if (index === 4) return toneColors(row.pajakTahunanStatus).text;
          if (index === 5) return toneColors(row.pajak5TahunanStatus).text;
          return toneColors(row.keurStatus).text;
        }
        return COLORS.body;
      });
    }
    doc.y += 16;
  }

  attentionPage() {
    const attention = this.report.rows.filter((r) => r.overallStatus !== 'ok');
    if (attention.length === 0) return;

    const { doc } = this;
    doc.addPage();
    this.drawPageHeader();
    this.sectionTitle(
      'Daftar Tindakan Prioritas',
      `${formatNumber(attention.length)} kendaraan memerlukan tindakan`
    );

    let index = 0;
    for (const row of attention) {
      index += 1;
      this.ensureSpace(58);
      const boxTop = doc.y;
      const boxHeight = 52;
      const colors = toneColors(row.overallStatus);
      doc.roundedRect(MARGIN, boxTop, this.contentWidth, boxHeight, 5).fill(COLORS.panel);
      doc.roundedRect(MARGIN, boxTop, 3, boxHeight, 1.5).fill(colors.text);

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(COLORS.ink)
        .text(`${index}. ${row.plat || '-'} - ${row.merk || '-'}`, MARGIN + 12, boxTop + 8, {
          width: this.contentWidth - 110,
        });
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(colors.text)
        .text(row.overallStatusText.toUpperCase(), MARGIN + this.contentWidth - 96, boxTop + 8, {
          width: 84,
          align: 'right',
        });
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COLORS.dim)
        .text(
          `${row.lokasi || 'Tanpa lokasi'} | PIC: ${row.pic || '-'} | Odometer: ${formatNumber(row.kmSekarang)} km`,
          MARGIN + 12,
          boxTop + 22,
          { width: this.contentWidth - 24 }
        );

      const issues = [
        row.pajakTahunanStatus !== 'ok'
          ? `Pajak tahunan ${complianceText(row.pajakTahunanStatus, row.pajakTahunanDays)} (${daysLabel(row.pajakTahunanDays)})`
          : null,
        row.pajak5TahunanStatus !== 'ok'
          ? `Pajak 5 tahun ${complianceText(row.pajak5TahunanStatus, row.pajak5TahunanDays)} (${daysLabel(row.pajak5TahunanDays)})`
          : null,
        row.keurStatus !== 'ok' ? `KEUR ${complianceText(row.keurStatus, row.keurDays)} (${daysLabel(row.keurDays)})` : null,
        row.serviceStatus !== 'ok'
          ? `Servis ${complianceText(row.serviceStatus, row.serviceDaysDate)} (${daysLabel(row.serviceDaysDate)}${row.kmLeft !== null ? `, sisa ${formatNumber(row.kmLeft)} km` : ''})`
          : null,
      ].filter(Boolean);

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COLORS.body)
        .text(issues.join('  •  '), MARGIN + 12, boxTop + 35, {
          width: this.contentWidth - 24,
          lineBreak: true,
        });

      doc.y = boxTop + boxHeight + 6;
    }
    doc.y += 8;
  }

  serviceHistoryPages() {
    const withHistory = this.report.rows.filter((r) => r.serviceHistory.length > 0);
    if (withHistory.length === 0) return;

    const { doc } = this;
    doc.addPage();
    this.drawPageHeader();
    this.sectionTitle('Riwayat Servis', `${formatNumber(withHistory.length)} kendaraan memiliki riwayat servis`);

    const columns = [
      { label: 'Tanggal', width: 62, align: 'left' as const },
      { label: 'Plat', width: 78, align: 'left' as const },
      { label: 'KM', width: 62, align: 'right' as const },
      { label: 'Jenis Servis', width: 140, align: 'left' as const },
      { label: 'Bengkel', width: 130, align: 'left' as const },
      { label: 'Biaya', width: 83, align: 'right' as const },
    ];
    const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);

    for (const row of withHistory) {
      this.ensureSpace(40);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(COLORS.ink)
        .text(`${row.plat || '-'} - ${row.merk || '-'}`, MARGIN, doc.y);
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COLORS.dim)
        .text(`${row.serviceHistory.length} riwayat | total Rp ${formatNumber(row.serviceCostTotal)}`, MARGIN, doc.y, {
          width: this.contentWidth,
          align: 'right',
        });
      doc.y += 12;
      this.drawTableHeader(columns, tableWidth);
      for (const entry of row.serviceHistory.slice(0, 12)) {
        this.ensureSpace(20);
        this.drawRow(
          [
            formatDate(entry.tanggal),
            row.plat || '-',
            formatNumber(entry.km),
            entry.jenis || '-',
            entry.bengkel || '-',
            `Rp ${formatNumber(entry.biaya)}`,
          ],
          columns,
          tableWidth,
          doc.y
        );
      }
      if (row.serviceHistory.length > 12) {
        this.ensureSpace(14);
        doc
          .font('Helvetica-Oblique')
          .fontSize(7)
          .fillColor(COLORS.faint)
          .text(`... dan ${row.serviceHistory.length - 12} riwayat lainnya`, MARGIN, doc.y);
        doc.y += 12;
      }
      doc.y += 10;
    }
  }

  odometerPages() {
    const withReadings = this.report.rows.filter((r) => r.odometerHistory.length > 0);
    if (withReadings.length === 0) return;

    const { doc } = this;
    doc.addPage();
    this.drawPageHeader();
    this.sectionTitle('Riwayat Odometer', 'Pembacaan odometer mingguan per kendaraan');

    const columns = [
      { label: 'Tanggal', width: 78, align: 'left' as const },
      { label: 'Plat', width: 88, align: 'left' as const },
      { label: 'Odometer (km)', width: 95, align: 'right' as const },
      { label: 'Sumber', width: 90, align: 'left' as const },
      { label: 'Koreksi', width: 60, align: 'left' as const },
    ];
    const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);

    for (const row of withReadings) {
      this.ensureSpace(40);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(COLORS.ink)
        .text(`${row.plat || '-'} - ${row.merk || '-'}`, MARGIN, doc.y);
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COLORS.dim)
        .text(`${row.odometerHistory.length} pembacaan`, MARGIN, doc.y, { width: this.contentWidth, align: 'right' });
      doc.y += 12;
      this.drawTableHeader(columns, tableWidth);
      for (const reading of row.odometerHistory.slice(0, 10)) {
        this.ensureSpace(20);
        this.drawRow(
          [
            formatDate(reading.tanggal),
            row.plat || '-',
            formatNumber(reading.km),
            reading.sumber || '-',
            reading.koreksi ? 'Ya' : 'Tidak',
          ],
          columns,
          tableWidth,
          doc.y
        );
      }
      if (row.odometerHistory.length > 10) {
        this.ensureSpace(14);
        doc
          .font('Helvetica-Oblique')
          .fontSize(7)
          .fillColor(COLORS.faint)
          .text(`... dan ${row.odometerHistory.length - 10} pembacaan lainnya`, MARGIN, doc.y);
        doc.y += 12;
      }
      doc.y += 10;
    }
  }

  build() {
    this.coverPage();
    this.summaryPage();
    this.vehiclePages();
    this.attentionPage();
    this.serviceHistoryPages();
    this.odometerPages();
    this.drawPageFooter();
    this.doc.end();
    return this.doc;
  }
}

export function renderReportPdf(report: Report) {
  return new PdfReport(report).build();
}
