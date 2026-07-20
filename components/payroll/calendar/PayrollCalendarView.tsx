'use client';

interface PayrollCalendarViewProps {
  currentDate: Date;
  currentView: string;
  months: string[];
  weekdays: string[];
  canViewDetails: boolean;
  isDragging: boolean;
  getDaysInMonth: (date: Date) => Array<{ date: Date; isCurrentMonth: boolean }>;
  isToday: (date: Date) => boolean;
  isDateSelected: (date: Date) => boolean;
  handleMouseDown: (date: Date) => void;
  handleMouseEnter: (date: Date) => void;
  handleMouseUp: () => void;
  renderDateActions: (date: Date) => React.ReactNode;
  getActionsForDate: (date: Date) => any[];
}

function getActionDotClass(tipo: string) {
  switch (tipo) {
    case 'venta':
      return 'bg-green-500';
    case 'servicio':
      return 'bg-blue-500';
    case 'asistencia':
      return 'bg-purple-500';
    case 'propina':
      return 'bg-yellow-500';
    case 'anticipo':
      return 'bg-red-500';
    case 'hora_extra':
      return 'bg-orange-500';
    default:
      return 'bg-gray-400';
  }
}

export function PayrollCalendarView({
  currentDate,
  currentView,
  months,
  weekdays,
  canViewDetails,
  isDragging,
  getDaysInMonth,
  isToday,
  isDateSelected,
  handleMouseDown,
  handleMouseEnter,
  handleMouseUp,
  renderDateActions,
  getActionsForDate
}: PayrollCalendarViewProps) {
  if (currentView === 'multi') {
    return (
      <div className='p-4' onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {[0, 1, 2, 3].map(monthOffset => {
            const monthDate = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth() + monthOffset,
              1
            );
            const days = getDaysInMonth(monthDate);
            const monthName = months[monthDate.getMonth()];
            const year = monthDate.getFullYear();

            return (
              <div
                key={monthOffset}
                className='bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600'
              >
                <div className='p-3 border-b border-gray-200 dark:border-gray-600'>
                  <h3 className='text-sm font-semibold text-gray-900 dark:text-white text-center'>
                    {monthName} {year}
                  </h3>
                </div>

                <div className='grid grid-cols-7 text-xs'>
                  {weekdays.map(day => (
                    <div
                      key={`${monthOffset}-${day}`}
                      className='p-1 text-center text-gray-600 dark:text-gray-400 font-medium'
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className='grid grid-cols-7'>
                  {days.slice(0, 35).map((day, index) => {
                    const isCurrentDay = isToday(day.date);
                    const isSelected = isDateSelected(day.date);
                    const actions = getActionsForDate(day.date);
                    const uniqueActions = Object.values(
                      actions.reduce((acc: Record<string, any>, action: any) => {
                        if (!acc[action.tipo]) acc[action.tipo] = action;
                        return acc;
                      }, {})
                    );

                    return (
                      <div
                        key={`${monthOffset}-${index}`}
                        className={`min-h-[32px] p-1 border-r border-b border-gray-200 dark:border-gray-600 ${
                          canViewDetails
                            ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
                            : 'cursor-not-allowed opacity-60'
                        } transition-colors relative select-none ${
                          isCurrentDay ? 'bg-blue-100 dark:bg-blue-800' : ''
                        } ${
                          isSelected
                            ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600'
                            : ''
                        } ${isDragging && canViewDetails ? 'cursor-grabbing' : ''}`}
                        onMouseDown={e => {
                          e.preventDefault();
                          handleMouseDown(day.date);
                        }}
                        onMouseEnter={() => handleMouseEnter(day.date)}
                      >
                        <div
                          className={`text-xs ${
                            !day.isCurrentMonth
                              ? 'text-gray-400 dark:text-gray-600'
                              : isCurrentDay
                                ? 'text-blue-600 dark:text-blue-300 font-bold'
                                : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {day.date.getDate()}
                        </div>
                        {day.isCurrentMonth && (
                          <div className='flex flex-wrap gap-0.5 mt-0.5'>
                            {uniqueActions.slice(0, 4).map((action: any, index: number) => (
                              <div
                                key={index}
                                className={`w-1.5 h-1.5 rounded-full ${getActionDotClass(
                                  action.tipo
                                )}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);

  return (
    <>
      <div className='grid grid-cols-7 border-b border-gray-200 dark:border-gray-700'>
        {weekdays.map(day => (
          <div
            key={day}
            className='p-1.5 sm:p-3 text-center text-[10px] sm:text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700'
          >
            {day}
          </div>
        ))}
      </div>

      <div
        className='grid grid-cols-7 min-h-[300px] sm:min-h-[500px]'
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {days.map((day, index) => {
          const isCurrentDay = isToday(day.date);
          const isSelected = isDateSelected(day.date);

          return (
            <div
              key={index}
              className={`min-h-[50px] sm:min-h-[80px] p-0.5 sm:p-2 border-r border-b border-gray-200 dark:border-gray-700 ${
                canViewDetails
                  ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
                  : 'cursor-not-allowed opacity-60'
              } transition-colors select-none ${
                isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              } ${
                isSelected
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600'
                  : ''
              } ${isDragging && canViewDetails ? 'cursor-grabbing' : ''}`}
              onMouseDown={e => {
                e.preventDefault();
                handleMouseDown(day.date);
              }}
              onMouseEnter={() => handleMouseEnter(day.date)}
            >
              <div
                className={`text-[11px] sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                  !day.isCurrentMonth
                    ? 'text-gray-400 dark:text-gray-600'
                    : isCurrentDay
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-gray-900 dark:text-white'
                }`}
              >
                {day.date.getDate()}
              </div>
              {day.isCurrentMonth && renderDateActions(day.date)}
            </div>
          );
        })}
      </div>
    </>
  );
}
