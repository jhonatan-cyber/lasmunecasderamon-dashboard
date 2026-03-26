'use client';

import { useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

interface CollapsibleCardProps {
    title: ReactNode;
    children: ReactNode;
    defaultOpen?: boolean;
    headerClassName?: string;
    className?: string;
    /** Extra content to show in the header right side */
    headerRight?: ReactNode;
}

export function CollapsibleCard({
    title,
    children,
    defaultOpen = true,
    headerClassName,
    className,
    headerRight,
}: CollapsibleCardProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card className={cn('border-0 shadow-md overflow-hidden', className)}>
                <CollapsibleTrigger asChild>
                    <CardHeader
                        className={cn(
                            'cursor-pointer select-none transition-colors hover:opacity-90',
                            headerClassName
                        )}
                    >
                        <div className="flex items-center justify-between w-full">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                {title}
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                {headerRight}
                                <ChevronDown
                                    className={cn(
                                        'h-5 w-5 transition-transform duration-300 ease-in-out',
                                        isOpen ? 'rotate-0' : '-rotate-90',
                                        headerClassName?.includes('text-white') ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                                    )}
                                />
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                    <CardContent className="p-6">
                        {children}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
