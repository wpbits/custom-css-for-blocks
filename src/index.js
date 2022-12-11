import './block'; 
import globalMeta from './global';

import { registerPlugin } from '@wordpress/plugins'; 

registerPlugin( 'custom-css-for-blocks-global-css', {
    render: globalMeta,
    icon: 'admin-appearance',
} ); 