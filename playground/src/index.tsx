import {createRoot} from 'react-dom/client';
import {ThemeProvider} from '@gravity-ui/uikit';
import '@local/transform-dist/js/yfm.js';
import '@local/transform-dist/css/yfm.css';

import {App} from './App';
import './index.css';
import './styles.scss';
import './overrides.scss';

const container = document.getElementById('app');
const root = createRoot(container as HTMLElement);

root.render(
    <ThemeProvider theme="light">
        <App />
    </ThemeProvider>,
);
