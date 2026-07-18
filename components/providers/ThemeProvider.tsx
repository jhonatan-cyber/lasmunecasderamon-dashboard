import { ThemeProvider as NextThemesProvider } from '@wrksz/themes/next';
import type { ThemeProviderProps } from '@wrksz/themes/next';

export async function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
