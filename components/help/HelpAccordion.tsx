'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface HelpAccordionProps {
  faqData: FaqItem[];
}

export function HelpAccordion({ faqData }: HelpAccordionProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFAQ = faqData.filter(
    item =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className='relative max-w-md'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
        <Input
          placeholder='Buscar en la ayuda...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className='pl-10'
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <HelpCircle className='h-5 w-5' />
            Preguntas Frecuentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFAQ.length === 0 ? (
            <div className='text-center py-8'>
              <p aria-live='polite' className='text-gray-500'>
                No se encontraron resultados para &ldquo;{searchTerm}&rdquo;
              </p>
            </div>
          ) : (
            <Accordion type='single' collapsible className='w-full'>
              {filteredFAQ.map(item => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger className='text-left'>
                    <div className='flex items-center gap-2'>
                      <span>{item.question}</span>
                      <Badge variant='outline' className='text-xs'>
                        {item.category}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className='text-gray-600'>{item.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </>
  );
}
