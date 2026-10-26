import {createRoot} from 'react-dom/client';
import {PageConstructor, PageConstructorProvider} from '@gravity-ui/page-constructor';

// The message protocol used by Page Constructor's DeviceIframe.
const ready = 'PC_EDITOR_DEVICE_MESSAGE_READY';
const update = 'PC_EDITOR_DEVICE_MESSAGE_UPDATE';
const parentOrigin = window.parent.location.origin;
const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);

window.addEventListener('message', (event) => {
    if (event.source !== window.parent || event.origin !== parentOrigin) {
        return;
    }
    if (event.data?.type === update) {
        const {constructorProps, providerProps} = event.data.data;
        root.render(
            <PageConstructorProvider {...providerProps}>
                <PageConstructor {...constructorProps} />
            </PageConstructorProvider>,
        );
    }
});

window.parent.postMessage({type: ready}, parentOrigin);
