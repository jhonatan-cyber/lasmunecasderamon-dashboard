export const SELECT_LABEL_CLASS =
  'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide';

export const SELECT_TRIGGER_CLASS =
  'flex h-11 w-full items-center justify-between gap-2 rounded-full border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-900 shadow-none transition-colors hover:border-gray-400 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-black disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-slate-900/50 dark:text-white [&>span]:line-clamp-1';

export const SELECT_MULTI_TRIGGER_CLASS =
  'w-full min-h-[44px] rounded-full border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-left text-gray-900 transition-colors hover:border-gray-400 focus:border-black focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-slate-900/50 dark:text-white';

export const SELECT_INPUT_CLASS =
  'h-11 rounded-full border border-gray-300 bg-gray-100 text-gray-900 shadow-none transition-colors hover:border-gray-400 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-gray-700 dark:bg-slate-900/50 dark:text-white';

export const SELECT_CONTENT_CLASS =
  'z-50 overflow-hidden rounded-3xl border border-gray-200 bg-white p-0 text-popover-foreground shadow-xl dark:border-gray-800 dark:bg-zinc-950';

export const SELECT_CONTENT_WIDE_CLASS = `${SELECT_CONTENT_CLASS} w-[320px]`;

export const SELECT_VIEWPORT_CLASS = 'w-full min-w-[var(--radix-select-trigger-width)] p-1';

export const SELECT_SEARCH_WRAPPER_CLASS =
  'border-b border-gray-100 bg-gray-50/80 p-2 dark:border-gray-800 dark:bg-zinc-900/80';

export const SELECT_SEARCH_INPUT_CLASS = `${SELECT_INPUT_CLASS} bg-white dark:bg-slate-950`;

export const SELECT_ITEM_CLASS =
  'relative flex w-full cursor-default select-none items-center rounded-md px-3 py-2 pr-8 text-sm text-gray-700 outline-none transition-colors focus:bg-gray-100 focus:text-gray-900 data-[state=checked]:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:text-zinc-100 dark:focus:bg-white/10 dark:focus:text-white dark:data-[state=checked]:bg-white/10';

export const SELECT_ITEM_INDICATOR_CLASS =
  'absolute right-3 flex h-4 w-4 items-center justify-center text-gray-500 dark:text-zinc-400';
