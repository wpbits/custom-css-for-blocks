const { compose } = wp.compose;
const { withSelect, withDispatch } = wp.data;
const { PluginDocumentSettingPanel } = wp.editPost;
const { __ } = wp.i18n;
const {  Notice, Spinner } = wp.components;
const { Fragment, useEffect, useState } = wp.element;
const { getCurrentUser, getUser } = wp.data.select('core');
import apiFetch from '@wordpress/api-fetch';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';

const PluginDocumentSettingPanelDemo = ({
	postMeta,
	postType,
	setPostMeta,
}) => {
	const rawCSS = postMeta.ccfg_rawCSS || '';
	const customCSS = postMeta.ccfg_customCSS || '';
	const [compileStatus, setCompileStatus] = useState('compiled');
	const currentUser = getCurrentUser();
	const user = getUser(currentUser.id);
	const [canUseCSS, setCanUseCSS] = useState(false);	
	const [getCSS, setCSS] = useState(rawCSS);

	// check if user can use custom css
	useEffect(() => {
		if (user && user.capabilities && user.capabilities[ccfg.roleBlocks]) {
			setCanUseCSS(true);
		}
	}, [user]);

	// get compiled css
	useEffect(() => {
		const delayDebounceFn = setTimeout(() => {
			const scss = getCSS;

			setCompileStatus('compiling');
 
				apiFetch({
					path: '/ccfg-rest/scss/',
					method: 'POST',
					data: { scss },
				}).then((res) => {
					updateCSS(res);
				}).catch(e => {	
					console.log(e);
				});
		 
		}, 1500);

		return () => clearTimeout(delayDebounceFn);
	}, [getCSS]);

	/**
	 * Update CSS
	 *
	 * @param {string} compiledCSS
	 */
	const updateCSS = (compiledCSS) => {
		if (compiledCSS === 'error') {
			setCompileStatus('error');
		} else {
			setCompileStatus('compiled');

			// update the css
			setPostMeta({
				ccfg_customCSS: compiledCSS,
				ccfg_rawCSS: getCSS,
			});
		}
	};

	/**
	 * CustomCSS <style> Component
	 *
	 * @return {string} customCSS
	 */
	const GeneratedCSS = () => customCSS && <style>{customCSS}</style>;

	return (
		<Fragment>
			<GeneratedCSS />

			<PluginDocumentSettingPanel
				initialOpen={false}
				title={__('Custom CSS', 'custom-css-for-blocks')}
				icon='admin-appearance'
			>
				<p>
					{__(
						'You can write your custom CSS with SASS support for this specific post.',
						'custom-css-for-blocks'
					)}
				</p>

				{!canUseCSS && (
							<Notice status="error" isDismissible={false}>
							{__(
								"You don't have permission to use this feature. Please contact your administrator.",
								'custom-css-for-blocks'
							)}
							</Notice>
						)}
						
				{compileStatus === 'error' && (
					<Notice status='error' isDismissible={false}>
						{__('Invalid SASS code.', 'custom-css-for-blocks')}
					</Notice>
				)}

				{compileStatus === 'compiling' && canUseCSS && (
					<div style={{ position: 'absolute', zIndex: 10 }}>
						<Spinner />
					</div>
				)}

				<CodeMirror
					value={rawCSS}
					height='200px'
					extensions={[css({})]}
					onChange={(value) => setCSS(value)}
					editable={canUseCSS}
				/>
			</PluginDocumentSettingPanel>
		</Fragment>
	);
};

export default compose([
	withSelect((select) => {
		return {
			postMeta: select('core/editor').getEditedPostAttribute('meta'),
			postType: select('core/editor').getCurrentPostType(),
		};
	}),
	withDispatch((dispatch) => {
		return {
			setPostMeta(newMeta) {
				dispatch('core/editor').editPost({ meta: newMeta });
			},
		};
	}),
])(PluginDocumentSettingPanelDemo);
