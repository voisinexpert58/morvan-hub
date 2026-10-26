// The production-facing shell uses the same authenticated workspace as pro.html.
// The historical module demonstrations remain in demo/core and demo/modules.
import { mountPro } from '../../../../demo/pro/workspace.mjs';
import '../../../../demo/pro/styles.css';

void mountPro(document.getElementById('root')!, {
  explorerHref: import.meta.env.VITE_EXPLORER_URL || 'http://localhost:5173/index.html#explorer'
});

