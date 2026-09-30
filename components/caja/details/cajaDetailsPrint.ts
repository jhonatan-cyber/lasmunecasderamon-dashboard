/** CSS que abre el overflow y muestra las tablas completas al imprimir. */
export const printStyles = `
  @media print {
    .print\\:overflow-visible {
      overflow: visible !important;
    }
    .print\\:max-h-none {
      max-height: none !important;
    }
    .print\\:block-all {
      display: block !important;
    }
    .print\\:show-all .TableBody {
      display: table-row-group !important;
    }
    .print\\:show-all .TableRow {
      display: table-row !important;
    }
    .print\\:hidden {
      display: none !important;
    }
  }
`;
