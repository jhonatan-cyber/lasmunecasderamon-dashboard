import { NextRequest, NextResponse } from "next/server";
import { WithdrawalService } from "@/lib/services/WithdrawalService";
import { jsonWithNormalizedDates } from "@/lib/api/date-response";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id_caja = searchParams.get("id_caja");
    
    if (!id_caja) {
      return NextResponse.json({ success: false, message: "id_caja es requerido" }, { status: 400 });
    }

    const retiros = await WithdrawalService.getByCajaId(id_caja);
    return jsonWithNormalizedDates({ success: true, data: retiros });
  } catch (error: any) {
    console.error('Error GET /api/cashregister/retiros:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await WithdrawalService.addRetiro(body);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error POST /api/cashregister/retiros:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
