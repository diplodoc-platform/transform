import type {ReactNode} from 'react';
import type {TabsItemProps, TabsProps} from '@gravity-ui/uikit';

import {useState} from 'react';

import {deleteQuery, persist} from './utils';

export type TabItem = TabsItemProps & {node?: ReactNode};

export type UseTabsParameters = {
    items: TabItem[];
    initial: string;
    onSetActive?: (active: string) => void;
};

function useTabs(parameters: UseTabsParameters): [TabsProps['items'], string, (a: string) => void] {
    const {items, initial, onSetActive} = parameters;

    const [active, setTabActive] = useState(initial);

    const handleSetTabActive = (active: string) => {
        deleteQuery('input');
        persist(active, 'mode');

        setTabActive(active);

        if (onSetActive) {
            onSetActive(active);
        }
    };

    return [items, active, handleSetTabActive];
}

export {useTabs};
export default {useTabs};
