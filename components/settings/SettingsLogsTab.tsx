'use client';

import { useCallback } from 'react';
import { useSettingsLogs } from '@/hooks/settings/useSettingsLogs';
import { SettingsLogsTabHeader } from '@/components/settings/SettingsLogsTabHeader';
import { SettingsAuditLogsCard } from '@/components/settings/SettingsAuditLogsCard';
import { SettingsErrorLogsCard } from '@/components/settings/SettingsErrorLogsCard';

export function SettingsLogsTab() {
  const {
    auditLogs,
    paginatedAuditLogs,
    auditPage,
    setAuditPage,
    auditPageSize,
    setAuditPageSize,
    auditTotalPages,
    errorLogs,
    paginatedErrorLogs,
    errorPage,
    setErrorPage,
    errorPageSize,
    setErrorPageSize,
    errorTotalPages,
    loading,
    refreshing,
    fetchLogs,
    formatDate,
    parseRequestBody,
    parseDetails,
    getRangeLabel
  } = useSettingsLogs();

  const handleRefresh = useCallback(() => fetchLogs(false), [fetchLogs]);

  return (
    <div className='space-y-4 sm:space-y-6'>
      <SettingsLogsTabHeader refreshing={refreshing} onRefresh={handleRefresh} />

      <SettingsAuditLogsCard
        auditLogs={auditLogs}
        paginatedAuditLogs={paginatedAuditLogs}
        auditPage={auditPage}
        setAuditPage={setAuditPage}
        auditPageSize={auditPageSize}
        setAuditPageSize={setAuditPageSize}
        auditTotalPages={auditTotalPages}
        loading={loading}
        formatDate={formatDate}
        parseDetails={parseDetails}
        getRangeLabel={getRangeLabel}
      />

      <SettingsErrorLogsCard
        errorLogs={errorLogs}
        paginatedErrorLogs={paginatedErrorLogs}
        errorPage={errorPage}
        setErrorPage={setErrorPage}
        errorPageSize={errorPageSize}
        setErrorPageSize={setErrorPageSize}
        errorTotalPages={errorTotalPages}
        loading={loading}
        formatDate={formatDate}
        parseRequestBody={parseRequestBody}
        getRangeLabel={getRangeLabel}
      />
    </div>
  );
}
