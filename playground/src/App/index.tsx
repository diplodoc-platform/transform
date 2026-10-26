import type {NavigationData} from '@gravity-ui/page-constructor';

import {PageConstructor, PageConstructorProvider, Theme} from '@gravity-ui/page-constructor';

import {useTabs} from 'src/useTabs';
import SplitViewEditor from 'src/SplitViewEditor';
import PageConstructorEditor from 'src/PageConstructorEditor';
import WYSIWYGEditor from 'src/WYSIWYGEditor';
import Header from 'src/Header';

import {deleteQuery, persist, restore} from '../utils';

import navigation from './navigation.json';
import './index.scss';

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
        onSetActive: (active) => {
            deleteQuery('input');
            persist(active, 'mode');
        },
    });

    return (
        <>
            <PageConstructorProvider theme={Theme.Light}>
                <PageConstructor
                    navigation={navigation as NavigationData}
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
                            page: () => <Playground>{mode[activeTab].node}</Playground>,
                        },
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
