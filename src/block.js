const { addFilter } = wp.hooks;
const { createHigherOrderComponent } = wp.compose;
const { Fragment, useEffect, useState } = wp.element;
const { InspectorControls } = wp.blockEditor;
const { PanelBody, Notice, Spinner } = wp.components;
const { getCurrentUser, getUser } = wp.data.select('core');

import {hasBlockSupport} from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';

/**
 * Add required attributes
 * @param {Object} settings
 * @return {Object} settings
 */
export function addAttributes( settings ) {
	if ( hasBlockSupport( settings, 'customClassName', true ) ) {

		settings.attributes = {
			...settings.attributes,
			customCSS: {
				type: 'text',
				default: '',
			},
			rawCSS: {
				type: 'text',
				default: '',
			},
		};
	}

	return settings;
}

addFilter(
	'blocks.registerBlockType',
	'custom-css-for-blocks/attribute/customCSS',
	addAttributes
);

/**
 * Custom CSS filter component
 */
const withInspectorControls = createHigherOrderComponent((BlockEdit) => {
	return (props) => {
		// return if its a reusable block

		const hasCustomClassName = hasBlockSupport(
			props.name,
			'customClassName',
			true
		);

		
		if (props.attributes.ref || ! hasCustomClassName) {
			return <BlockEdit {...props} />;
		}

		const { attributes, setAttributes, clientId } = props;
		const { customCSS, rawCSS, className } = attributes;
		const uniqueClassName = 'ccfg-unique-' + clientId.substr(2, 9);
		const [compileStatus, setCompileStatus] = useState(0);
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
				const scss = `.${uniqueClassName}{${getCSS}}`;

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
		 * Manage classes for duplicated/pasted items
		 */
		useEffect(() => {
			if (!customCSS) {
				return;
			}

			if (className && className.indexOf('ccfg-unique-') > -1) {
				setAttributes({
					className: className?.replaceAll(
						/(?=ccfg-unique-)([^\s]+)/g,
						uniqueClassName
					),
					customCSS: customCSS.replaceAll(
						/(?=ccfg-unique-)([^\s]+)/g,
						uniqueClassName
					),
				});
			}
		}, []);

		/**
		 * Update CSS
		 *
		 * @param {string} compiledCSS
		 */
		const updateCSS = (compiledCSS) => {
			if (!compiledCSS) {
				setAttributes({
					className: className
						?.replace(/(?=ccfg-unique-)([^\s]+)/i, '')
						.trim(),
					customCSS: '',
					rawCSS: '',
				});

				setCompileStatus(0);

				return;
			}

			if (compiledCSS === 'error') {
				setCompileStatus('error');
			} else {
				setCompileStatus('compiled');

				// there is no class lets add ours & update the css
				if (!className) {
					setAttributes({
						className: uniqueClassName,
						customCSS: compiledCSS,
						rawCSS: getCSS,
					});

					return;
				}

				// add the class to the list & update the css
				if (className.search('ccfg-unique-') < 0) {
					setAttributes({
						className: (className + ' ' + uniqueClassName).trim(),
						customCSS: compiledCSS,
						rawCSS: getCSS,
					});

					return;
				}

				// update the css
				setAttributes({
					customCSS: compiledCSS,
					rawCSS: getCSS,
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

				<BlockEdit {...props} />
				<InspectorControls>
					<PanelBody
						initialOpen={false}
						title={__('Custom CSS', 'custom-css-for-blocks')}
						icon="admin-appearance"
					>
						<p>
							{__(
								'You can write your custom CSS with SASS support for this specific block.',
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
							<Notice status="error" isDismissible={false}>
								{__(
									'Invalid SASS code.',
									'custom-css-for-blocks'
								)}
							</Notice>
						)}

						{compileStatus === 'compiling' && canUseCSS && (
							<div style={{ position: 'absolute', zIndex: 10 }}>
								<Spinner />
							</div>
						)}

						<CodeMirror
							value={rawCSS}
							height="200px"
							extensions={[css({})]}
							onChange={(value) => setCSS(value)}
							editable = {canUseCSS} 
						/>
					</PanelBody>
				</InspectorControls>
			</Fragment>
		);
	};
}, 'withInspectorControl');

addFilter(
	'editor.BlockEdit',
	'custom-css-for-blocks/with-inspector-controls',
	withInspectorControls
);
