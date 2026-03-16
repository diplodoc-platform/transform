import type {OffsetValues, Side, SideObject} from './types';

export const PAGE_CONTAINER_SELECTOR = '.dc-doc-page__content';

export const TOOLTIP_BASE_CLASS = 'yfm yfm-tooltip';

export const TOOLTIP_OPEN_CLASS = 'open';

export const TOOLTIP_DATA_ATTR = 'data-tooltip-id';

export const DEFAULT_OFFSET_VALUES: OffsetValues = {mainAxis: 5};

export const OPPOSITE_SIDES: Record<Side, Side> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
};

export const DEFAULT_SIDE_OBJECT: SideObject = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
};
