import {PageConstructor, PageConstructorProvider} from '@gravity-ui/page-constructor';

import {useTabs} from '../useTabs';
import SplitViewEditor from '../SplitViewEditor';
import PageConstructorEditor from '../PageConstructorEditor';
import WYSIWYGEditor from '../WYSIWYGEditor';
import Header from '../Header';
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

    return (
        <>
            {/* @ts-expect-error */}
            <PageConstructorProvider theme={'light'}>
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
