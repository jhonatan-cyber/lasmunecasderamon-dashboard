"use client";

import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel, faFilePdf } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useRef } from "react";
import { User } from "@/types/user";

interface ExportButtonsProps {
  users: User[];
  tableRef?: React.RefObject<HTMLTableElement>;
}

export function ExportButtons({ users }: ExportButtonsProps) {
  const tableRef = useRef<HTMLTableElement>(null);

  const exportToExcel = () => {
    const data = users.map((user, index) => ({
      "#": index + 1,
      RUN: user.run || "Sin RUN",
      Nombre: user.name || "",
      Apellido: user.lastName || "",
      Email: user.email || "Sin email",
      Teléfono: user.phone || "Sin teléfono",
      Rol: user.role || "Sin rol",
      Estado: user.status === 1 ? "Activo" : "Inactivo",
      "Estado Civil": user.maritalStatus || "Sin especificar",
      AFP: user.afp || "Sin especificar",
      Sueldo: user.salary ? `$${new Intl.NumberFormat('es-CL').format(user.salary)}` : "Sin sueldo",
      "Fecha Creación": user.created_at
        ? new Date(user.created_at).toLocaleDateString()
        : "Sin fecha",
      "Última Modificación": user.updated_at
        ? new Date(user.updated_at).toLocaleDateString()
        : "Sin modificar",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
    XLSX.writeFile(
      workbook,
      `usuarios_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = "Listado de Usuarios";
    const headers = [["#", "RUN", "Nombre", "Apellido", "Email", "Teléfono", "Rol", "Estado"]];

    const data = users.map((user, index) => [
      (index + 1).toString(),
      user.run || "Sin RUN",
      user.name || "",
      user.lastName || "",
      user.email || "Sin email",
      user.phone || "Sin teléfono",
      user.role || "Sin rol",
      user.status === 1 ? "Activo" : "Inactivo",
    ]);

    // Título del documento
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    // Tabla de datos
    autoTable(doc, {
      head: headers,
      body: data,
      startY: 30,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
        halign: "left",
        valign: "middle",
      },
      headStyles: {
        fillColor: [22, 22, 22],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 30 },
    });

    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Generado el: ${new Date().toLocaleDateString()}`,
        14,
        doc.internal.pageSize.height - 10
      );
    }

    doc.save(`usuarios_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportToPDF}
        className="gap-2 rounded-full hover:text-red-600 hover:scale-105 transition-all duration-200 text-xs sm:text-sm"
      >
        <FontAwesomeIcon icon={faFilePdf} className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
        PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToExcel}
        className="gap-2 rounded-full hover:text-green-600 hover:scale-105 transition-all duration-200 text-xs sm:text-sm"
      >
        <FontAwesomeIcon
          icon={faFileExcel}
          className="h-3 w-3 sm:h-4 sm:w-4 text-green-500"
        />
        Excel
      </Button>

      {/* Tabla oculta para la impresión */}
      <div style={{ display: "none" }}>
        <div ref={printRef} className="p-6">
          <h1 className="text-3xl font-bold mb-6">Listado de Usuarios</h1>
          <p className="text-base text-gray-600 mb-6">
            Generado el {new Date().toLocaleDateString()}
          </p>
          <table className="w-full text-base border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-center border w-16 text-lg">#</th>
                <th className="py-3 px-4 text-left border text-lg">RUN</th>
                <th className="py-3 px-4 text-left border text-lg">Nombre</th>
                <th className="py-3 px-4 text-left border text-lg">Apellido</th>
                <th className="py-3 px-4 text-left border text-lg">Email</th>
                <th className="py-3 px-4 text-left border text-lg">Teléfono</th>
                <th className="py-3 px-4 text-left border text-lg">Rol</th>
                <th className="py-3 px-4 text-left border text-lg">Estado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-center border">{index + 1}</td>
                  <td className="py-3 px-4 border">
                    {user.run || "Sin RUN"}
                  </td>
                  <td className="py-3 px-4 border">{user.name || ""}</td>
                  <td className="py-3 px-4 border">{user.lastName || ""}</td>
                  <td className="py-3 px-4 border">
                    {user.email || "Sin email"}
                  </td>
                  <td className="py-3 px-4 border">
                    {user.phone || "Sin teléfono"}
                  </td>
                  <td className="py-3 px-4 border">
                    {user.role || "Sin rol"}
                  </td>
                  <td className="py-3 px-4 border">
                    <span
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        user.status === 1
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.status === 1 ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 