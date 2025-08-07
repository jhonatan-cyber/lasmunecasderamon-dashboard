"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Search, HelpCircle, Book, MessageCircle, Mail, Phone, ExternalLink } from "lucide-react"

const faqData = [
  {
    id: "1",
    question: "¿Cómo puedo cambiar mi contraseña?",
    answer:
      "Puedes cambiar tu contraseña desde la sección de Configuración > Seguridad. Haz clic en 'Cambiar Contraseña' e introduce tu contraseña actual y la nueva contraseña.",
    category: "Cuenta",
  },
  {
    id: "2",
    question: "¿Cómo añado un nuevo producto?",
    answer:
      "Ve a la sección Productos y haz clic en 'Nuevo Producto'. Completa todos los campos requeridos como nombre, descripción, precio y stock, luego guarda los cambios.",
    category: "Productos",
  },
  {
    id: "3",
    question: "¿Puedo exportar mis datos?",
    answer:
      "Sí, puedes exportar tus datos desde la sección de Reportes. Selecciona el período deseado y haz clic en 'Exportar PDF' o 'Exportar Excel'.",
    category: "Reportes",
  },
  {
    id: "4",
    question: "¿Cómo gestiono los pedidos?",
    answer:
      "En la sección Pedidos puedes ver todos los pedidos, cambiar su estado, ver detalles del cliente y productos, e imprimir facturas.",
    category: "Pedidos",
  },
  {
    id: "5",
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Aceptamos tarjetas de crédito/débito (Visa, Mastercard, American Express), PayPal y transferencias bancarias.",
    category: "Facturación",
  },
]

const helpResources = [
  {
    title: "Guía de Inicio Rápido",
    description: "Aprende los conceptos básicos para comenzar",
    icon: Book,
    link: "#",
  },
  {
    title: "Documentación API",
    description: "Referencia completa de nuestra API",
    icon: ExternalLink,
    link: "#",
  },
  {
    title: "Tutoriales en Video",
    description: "Videos paso a paso para todas las funciones",
    icon: ExternalLink,
    link: "#",
  },
  {
    title: "Comunidad",
    description: "Únete a nuestra comunidad de usuarios",
    icon: MessageCircle,
    link: "#",
  },
]

export default function Help() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredFAQ = faqData.filter(
    (item) =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centro de Ayuda</h1>
        <p className="text-gray-600">Encuentra respuestas a tus preguntas y obtén soporte</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar en la ayuda..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {helpResources.map((resource, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <resource.icon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900">{resource.title}</h3>
              </div>
              <p className="text-sm text-gray-600">{resource.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Preguntas Frecuentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFAQ.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron resultados para "{searchTerm}"</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredFAQ.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <span>{item.question}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">{item.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat en Vivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Habla con nuestro equipo de soporte en tiempo real</p>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Disponible: Lun-Vie 9:00-18:00
            </div>
            <Button className="w-full">
              <MessageCircle className="h-4 w-4 mr-2" />
              Iniciar Chat
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Soporte por Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Envíanos un email y te responderemos en 24 horas</p>
            <div className="space-y-2 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                soporte@adminpro.com
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3" />
                +34 900 123 456
              </div>
            </div>
            <Button variant="outline" className="w-full bg-transparent">
              <Mail className="h-4 w-4 mr-2" />
              Enviar Email
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
