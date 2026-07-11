import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface ReceiptParams {
  logoUrl: string;
  clienteNombre: string;
  habitacionNombre: string;
  metodoPago: string;
  fecha: string;
  anfitrionasAtendiendo: string;
  monto: number;
}

export function generateReceiptHTML({
  logoUrl,
  clienteNombre,
  habitacionNombre,
  metodoPago,
  fecha,
  anfitrionasAtendiendo,
  monto
}: ReceiptParams): string {
  return `
      <html>
        <head>
          <title>Boleta Habitacion</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; background: #f8fafc; }
            .card { max-width: 420px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 24px; padding: 28px; background: #ffffff; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08); }
            .header { text-align: center; padding-bottom: 18px; border-bottom: 1px solid #e5e7eb; }
            .logo { width: 88px; height: auto; margin: 0 auto 12px; display: block; }
            .brand { font-size: 22px; font-weight: 800; margin: 0; }
            .subtitle { margin: 6px 0 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.18em; }
            .section { margin-top: 20px; }
            .section-title { font-size: 11px; font-weight: 800; color: #9a3412; text-transform: uppercase; letter-spacing: 0.16em; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin: 10px 0; }
            .label { color: #6b7280; font-size: 13px; }
            .value { font-weight: 700; text-align: right; }
            .service-box { margin-top: 18px; border: 1px solid #fed7aa; background: linear-gradient(135deg, #fff7ed, #ffffff); border-radius: 18px; padding: 16px; }
            .total { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #fdba74; margin-top: 14px; padding-top: 14px; font-size: 21px; font-weight: 800; color: #c2410c; }
            .footer { margin-top: 22px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <img src="${logoUrl}" alt="Las Muñecas de Ramón" class="logo" />
              <p class="brand">Las Muñecas de Ramón</p>
              <p class="subtitle">Boleta habitación</p>
            </div>

            <div class="section">
              <div class="section-title">Detalle de atención</div>
              <div class="row"><span class="label">Cliente</span><span class="value">${clienteNombre}</span></div>
              <div class="row"><span class="label">Habitación</span><span class="value">${habitacionNombre}</span></div>
              <div class="row"><span class="label">Método de pago</span><span class="value">${metodoPago}</span></div>
              <div class="row"><span class="label">Fecha</span><span class="value">${fecha}</span></div>
              <div class="row"><span class="label">Atendido por</span><span class="value">${anfitrionasAtendiendo || 'Sin anfitriona asignada'}</span></div>
            </div>

            <div class="service-box">
              <div class="section-title">Concepto</div>
              <div class="row"><span class="label">Servicio</span><span class="value">Uso de habitación privada</span></div>
              <div class="total"><span>Total habitación</span><span>${formatCurrencyCLP(monto)}</span></div>
            </div>

            <div class="footer">
              Gracias por su visita.<br />
              Documento generado desde el módulo de servicios privados.
            </div>
          </div>
        </body>
      </html>
  `;
}
