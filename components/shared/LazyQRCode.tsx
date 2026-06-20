'use client';

import React from 'react';
import dynamic from 'next/dynamic';

export interface QRCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  fgColor?: string;
  bgColor?: string;
  style?: React.CSSProperties;
  imageSettings?: {
    src: string;
    height: number;
    width: number;
    excavate: boolean;
    x?: number;
    y?: number;
  };
}

const QRCodeSVG = dynamic(() => import('qrcode.react').then(mod => mod.QRCodeSVG), {
  loading: () => (
    <div className='flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400'>
      Cargando QR...
    </div>
  )
});

export function LazyQRCode(props: QRCodeProps) {
  return <QRCodeSVG {...props} />;
}
