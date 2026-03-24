/* eslint-disable */
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { getTodayDateKey } from '@/lib/calendarUtils'

interface AsistenciaFormProps {
  onSubmit: (data: any) => void
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function AsistenciaForm({ onSubmit, isOpen, onOpenChange }: AsistenciaFormProps) {
  const form = useForm({
      defaultValues: {
        usuario_id: '',
      fecha: getTodayDateKey(),
      hora: new Date().toISOString().slice(11, 16),
      estado: 'presente',
    },
  })

  const handleSubmit = (data: any) => {
    onSubmit(data)
    if (onOpenChange) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] w-[95vw] max-w-[95vw] sm:w-auto max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">Registrar Asistencia</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Complete el formulario para registrar una asistencia manual.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4 sm:space-y-6">
                <FormField
                  control={form.control}
                  name="usuario_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Empleado</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="text-sm sm:text-base">
                            <SelectValue placeholder="Seleccione un empleado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1" className="text-sm sm:text-base">Empleado 1</SelectItem>
                          <SelectItem value="2" className="text-sm sm:text-base">Empleado 2</SelectItem>
                          <SelectItem value="3" className="text-sm sm:text-base">Empleado 3</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fecha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Fecha</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="text-sm sm:text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Hora</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="text-sm sm:text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Estado</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="text-sm sm:text-base">
                            <SelectValue placeholder="Seleccione un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="presente" className="text-sm sm:text-base">Presente</SelectItem>
                          <SelectItem value="tardanza" className="text-sm sm:text-base">Tardanza</SelectItem>
                          <SelectItem value="ausente" className="text-sm sm:text-base">Ausente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 border-t px-6 py-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto text-sm sm:text-base px-4 sm:px-6 py-2"
                >
                  Guardar
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
