import {useTabs} from 'src/useTabs';
import SplitViewEditor from 'src/SplitViewEditor';
import PageConstructorEditor from 'src/PageConstructorEditor';
import WYSIWYGEditor from 'src/WYSIWYGEditor';
import Header from 'src/Header';
import {PageConstructor, PageConstructorProvider} from '@gravity-ui/page-constructor';
import {Button, useTheme} from '@gravity-ui/uikit';
import {THEME_NAME, useThemeApp} from 'src/context/theme';

import {restore} from '../utils';

import './index.scss';
import navigation from './navigation.json';

export type PlaygroundProperties = {
    content?: string;
    persistRestore?: boolean;
};

export enum EditorType {
    SPLIT = 'SPLIT_VIEW',
    WYSIWYG = 'WYSIWYG',
    PC = 'PC',
}

const mode = {
    [EditorType.SPLIT]: {
        title: 'Split view',
        node: <SplitViewEditor persistRestore={true} />,
    },
    [EditorType.WYSIWYG]: {
        title: 'WYSIWYG',
        node: <WYSIWYGEditor />,
    },
    [EditorType.PC]: {
        title: 'Page constructor',
        node: <PageConstructorEditor />,
    },
};

const App = () => {
    const urlMode = restore('mode');

    const [items, activeTab, handleSetInputAreaTabActive] = useTabs({
        items: Object.entries(mode).map(([key, value]) => ({
            id: key,
            ...value,
        })),
        initial: mode[urlMode] ? urlMode : EditorType.SPLIT,
    });
    const {setTheme, themeType, setThemeType} = useThemeApp();
    const theme = useTheme();

    return (
        <>
            {/* @ts-expect-error */}
            <PageConstructorProvider theme={theme}>
                <PageConstructor
                    // @ts-expect-error
                    navigation={navigation}
                    custom={{
                        navigation: {
                            controls: () => (
                                <Header
                                    items={items}
                                    activeTab={activeTab}
                                    handleSetInputAreaTabActive={handleSetInputAreaTabActive}
                                />
                            ),
                        },
                        blocks: {
                            page: () => (
                                // @ts-expect-error
                                <Playground persistRestore={true}>
                                    {mode[activeTab].node}
                                </Playground>
                            ),
                        },
                    }}
                    renderMenu={() => {
                        const click = () => {
                            setTheme((x) => (x === 'light' ? 'dark' : 'light'));
                        };

                        const clickMainTheme = () => {
                            setThemeType((x) => (x === 'default' ? 'diplodoc' : 'default'));
                        };

                        return (
                            <div className="theme-section">
                                <div>Тип темы: </div>
                                <div>
                                    <Button onClick={clickMainTheme}>
                                        {THEME_NAME[themeType]}
                                    </Button>
                                </div>
                                <div>Тема:</div>
                                <div>
                                    <Button onClick={click}>
                                        {theme === 'light' ? 'Светлая' : 'Темная'}
                                    </Button>
                                </div>
                            </div>
                        );
                    }}
                    content={{
                        blocks: [
                            {
                                type: 'page',
                                resetPaddings: true,
                            },
                        ],
                    }}
                />
            </PageConstructorProvider>
        </>
    );
};

function Playground({children}) {
    return (
        <div className="playground">
            <div className="editor">{children}</div>
        </div>
    );
}

export {App, Playground};
export default {App, Playground};
