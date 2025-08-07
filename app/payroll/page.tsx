'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PayrollPage() {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Planillas</h1>
        <Button variant="default">
          Generar Planilla
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Módulo en Desarrollo</CardTitle>
          <CardDescription>
            El módulo de planillas está siendo reconstruido. Pronto estará disponible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Este módulo permitirá generar planillas de pago basadas en asistencias,
            calcular descuentos y generar reportes de pago.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}