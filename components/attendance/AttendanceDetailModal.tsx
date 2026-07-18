'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAttendanceDetail } from '@/hooks/attendance/useAttendanceDetail';
import { AttendanceFinancialSummary } from './AttendanceFinancialSummary';
import { AttendanceTableSection, AttendanceDetailFooter } from './AttendanceTableSection';

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  userNick: string;
}

export default function AttendanceDetailModal({
  isOpen,
  onClose,
  userId,
  userName,
  userNick,
}: AttendanceDetailModalProps) {
  const {
    asistencias,
    loading,
    error,
    currentPage,
    pageSize,
    pageSizeOptions,
    paginatedAsistencias,
    totalPages,
    totals,
    handlePageChange,
    setPageSize,
    formatDate,
    formatTime,
    getStatusBadgeText,
  } = useAttendanceDetail({ isOpen, userId });

  const renderStatusBadge = (estado: number) => {
    const info = getStatusBadgeText(estado);
    return <Badge className={info.className}>{info.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='shrink-0 px-6 pt-6 pb-4 border-b dark:border-gray-700'>
          <DialogTitle className='text-xl font-bold dark:text-white'>
            Detalle de Asistencias
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <div className='space-y-4'>
            <AttendanceFinancialSummary
              userName={userName}
              userNick={userNick}
              totals={totals}
            />

            <AttendanceTableSection
              asistencias={asistencias}
              paginatedAsistencias={paginatedAsistencias}
              loading={loading}
              error={error}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              onPageChange={handlePageChange}
              onPageSizeChange={setPageSize}
              formatDate={formatDate}
              formatTime={formatTime}
              renderStatusBadge={renderStatusBadge}
            />
          </div>
        </div>

        <AttendanceDetailFooter onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
