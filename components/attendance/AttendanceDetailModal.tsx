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
  userNick
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
    getStatusBadgeText
  } = useAttendanceDetail({ isOpen, userId });

  const renderStatusBadge = (estado: number) => {
    const info = getStatusBadgeText(estado);
    return <Badge className={info.className}>{info.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='shrink-0 border-b p-4 pr-12 pb-3 dark:border-gray-700 sm:p-6 sm:pr-14 sm:pb-3'>
          <DialogTitle className='text-xl font-bold dark:text-white'>
            Detalle de Asistencias
          </DialogTitle>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
          <div className='space-y-4'>
            <AttendanceFinancialSummary userName={userName} userNick={userNick} totals={totals} />

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
