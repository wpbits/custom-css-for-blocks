const { compose } = wp.compose;
const { withSelect, withDispatch } = wp.data;
const { PluginDocumentSettingPanel } = wp.editPost;
const { __ } = wp.i18n;
const { PanelBody, Notice, Spinner } = wp.components;
const { Fragment, useEffect, useState } = wp.element;
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
	const [getCSS, setCSS] = useState(rawCSS);

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

				{compileStatus === 'error' && (
					<Notice status='error' isDismissible={false}>
						{__('Invalid SASS code.', 'custom-css-for-blocks')}
					</Notice>
				)}

				{compileStatus === 'compiling' && (
					<div style={{ position: 'absolute', zIndex: 10 }}>
						<Spinner />
					</div>
				)}

				<CodeMirror
					value={rawCSS}
					height='200px'
					extensions={[css({})]}
					onChange={(value) => setCSS(value)}
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
