// SWC innit
import '@spectrum-web-components/theme/sp-theme.js'
import '@spectrum-web-components/theme/src/themes.js'
// SWC Components
import '@spectrum-web-components/status-light/sp-status-light.js'
import '@spectrum-web-components/action-button/sp-action-button.js'
import '@spectrum-web-components/field-label/sp-field-label.js'
import '@spectrum-web-components/textfield/sp-textfield.js'
import '@spectrum-web-components/checkbox/sp-checkbox.js'
import '@spectrum-web-components/divider/sp-divider.js'
import '@spectrum-web-components/button/sp-button.js'
import '@spectrum-web-components/link/sp-link.js'
// Local
import { WakaTimePlugin } from './app'
import { HostInformation } from './utils'

declare global {
	interface Window {
		cep: any
		__adobe_cep__: any
	}
}

const csInterface = new CSInterface()
window.cep = window.__adobe_cep__

if (window.cep) {
	try {
		window.cep.clipboard = window.cep.clipboard || {}
	} catch (e) {
		console.warn('Failed to initialize CEP clipboard:', e)
	}
}

const enablePremiereInput = () => {
	// Triple-layer input enablement for Premiere
	csInterface.evalScript(
		`
	try {
	  // Method 1: Modern CEP
	  if (window.__adobe_cep__) {
		window.__adobe_cep__.setInputEventEnabled(true);
	  }
	  // Method 2: Legacy CEP
	  if (typeof $.global.cep_node !== 'undefined') {
		$.global.cep_node.require('cep').setInputEventEnabled(true);
	  }
	  // Method 3: Photoshop-style
	  if (typeof csxs !== 'undefined') {
		csxs.evalScript('app.enableInputEvents()');
	  }
	} catch(e) {
	  console.warn('Input enable failed:', e);
	}
  `,
		() => {}
	)

	// Physical input fallback for Spectrum components
	document.querySelectorAll('sp-textfield').forEach((textfield) => {
		const realInput = textfield.shadowRoot?.querySelector('input')
		if (realInput) {
			realInput.addEventListener('focus', () => {
				csInterface.evalScript('$.global.cep_node.require("cep").focusPanel()', () => {})
			})
			realInput.style.pointerEvents = 'auto' // Critical for Premiere
			textfield.style.pointerEvents = 'auto'
		}
		realInput.addEventListener('mousedown', () => {
			csInterface.evalScript('$.global.cep_node.require("cep").focusPanel()', () => {})
		})
	})
}

// Initialize after slight delay
setTimeout(() => {
	const host = csInterface.getHostEnvironment().appName
	if (host.includes('Premiere Pro')) {
		enablePremiereInput()

		// Additional workaround for Premiere's shadow DOM issues
		document.querySelectorAll('sp-textfield').forEach((el) => {
			el.shadowRoot?.querySelector('input')?.setAttribute('data-premiere-fix', 'true')
		})
	}
}, 300)

// * UTIL
const asyncEvalScript = (script: string): Promise<string> => {
	return new Promise((resolve, _) => {
		csInterface.evalScript(script, resolve)
	})
}

const updateTheme = () => {
	const themeInfo = csInterface.getHostEnvironment().appSkinInfo
	const element = document.querySelector('sp-theme')

	if (!element || !themeInfo) return
	console.log('[WakaTime] Updating theme', themeInfo)

	const getRgbLightness = ({ red, green, blue }: { [key: string]: number }) => {
		if (!green || !red || !blue) return

		const max = Math.max(red, green, blue)
		const min = Math.min(red, green, blue)
		const lightness = Math.round((max + min) / 2)
		return lightness // should be a percentage, but is easier this way
	}

	// The lightness goes from 0 to 255, we just divide it into four (255/4 = 63.75)
	const LIGHT = 255 / 4
	const value = getRgbLightness(themeInfo.panelBackgroundColor.color)
	if (value === null) return

	let theme = null
	if (value <= LIGHT) theme = 'darkest'
	else if (value <= LIGHT * 2) theme = 'dark'
	else if (value <= LIGHT * 3) theme = 'lightest'
	else if (value <= LIGHT * 4) theme = 'light'

	console.log('[WakaTime] Updating "sp-theme" to', theme)
	const { red, green, blue } = themeInfo.panelBackgroundColor.color
	element.style.background = `rgb(${red},${green},${blue})`
	element.setAttribute('color', theme)
}

WakaTimePlugin.getActiveFile = async () => {
	const csInterface = new CSInterface()
	const hostName = csInterface.getHostEnvironment().appName

	let script = ''

	switch (hostName) {
		case 'PHXS': // Photoshop
		case 'PHSP':
			script = 'app.activeDocument.fullName.fsName'
			break
		case 'ILST': // Illustrator
			script = 'app.activeDocument.fullName'
			break
		case 'PPRO': // Premiere Pro
			script = `app.project.name` // this gets project name, not file path
			break
		default:
			console.warn('[WakaTime] No script for host:', hostName)
			return null
	}

	const result = await asyncEvalScript(script)
	if (!result || result.includes('EvalScript error')) return null

	const normalizedPath = result.replace(/\\/g, '/')
	console.log('[WakaTime] Raw currentDocument:', result)
	console.log('[WakaTime] Normalized path:', normalizedPath)

	return normalizedPath
}

HostInformation.init_CEP()
console.log('[WakaTime] Host name:', HostInformation.HOST_NAME)
WakaTimePlugin.initialize()
WakaTimePlugin.initListeners()

//* All links must be handled or else the extension will be used like a browser
document.querySelectorAll('sp-link')?.forEach((el) => {
	el.addEventListener('click', (event) => {
		event.preventDefault()
		const target = event.target as HTMLAnchorElement
		target?.href && csInterface.openURLInDefaultBrowser(target.href)
	})
})

//* Fix shadowRoot not working properly with text inputs
// Generates an array of keyboard events ranging from 65(a) to 109(-)
// This doesn't not include their shift pressing version
//const keyCodes: Partial<KeyboardEvent>[] = [...Array(110 - 65)].map((_, accumulator) => {
//	return { keyCode: 65 + accumulator }
//})
//csInterface.registerKeyEventsInterest(JSON.stringify(keyCodes))
//csInterface.registerKeyEventsInterest(JSON.stringify([{ keyCode: 0 }]))

const keyCodes = Array.from({ length: 222 }, (_, i) => ({ keyCode: i }))
csInterface.registerKeyEventsInterest(JSON.stringify(keyCodes))

// Init theme events
updateTheme()
csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, updateTheme, null)

