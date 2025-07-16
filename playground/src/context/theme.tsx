import {createContext, useContext, useMemo, useState} from 'react';

export type Theme = 'light' | 'dark';

const ThemeContextApp = createContext<{
    theme: Theme;
    setTheme: React.Dispatch<React.SetStateAction<Theme>>;
} | null>(null);

export const useThemeApp = () => {
    const context = useContext(ThemeContextApp);

    if (!context) {
        throw new Error('useThemeApp must be used within a ThemeProviderApp');
    }

    return context;
};

export const ThemeProviderApp = ({children}) => {
    const [theme, setTheme] = useState<Theme>('light');

    const ctx = useMemo(() => {
        return {
            theme,
            setTheme,
        };
    }, [theme, setTheme]);

    return <ThemeContextApp.Provider value={ctx}>{children}</ThemeContextApp.Provider>;
};
