import {createContext, useContext, useMemo, useState} from 'react';

export type Theme = 'light' | 'dark';
export type TypeStyle = 'default' | 'diplodoc';

const ThemeContextApp = createContext<{
    themeType: string;
    setThemeType: React.Dispatch<React.SetStateAction<TypeStyle>>;
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

export const THEME: Record<TypeStyle, string> = {
    default: '',
    diplodoc: 'dc-doc-page',
};

export const THEME_NAME: Record<TypeStyle, string> = {
    default: 'Стандарт',
    diplodoc: 'Диплодок',
};

export const ThemeProviderApp = ({children}) => {
    const [theme, setTheme] = useState<Theme>('light');
    const [themeType, setThemeType] = useState<TypeStyle>('default');

    const ctx = useMemo(() => {
        return {
            theme,
            themeType,
            setThemeType,
            setTheme,
        };
    }, [theme, setTheme, themeType, setThemeType]);

    return <ThemeContextApp.Provider value={ctx}>{children}</ThemeContextApp.Provider>;
};
