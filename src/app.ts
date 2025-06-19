import './styles.css'
import { ELEMENTS, CONFIG, STATUS } from './constants'
import { updateConnectionStatus, isLastestVersion } from './utils'
import { sendHeartbeat } from './wakatime'
import Storage from './storage'

export class WakaTimePlugin {
	private static intervalRef: NodeJS.Timer | null = null

	public static async getActiveFile(): Promise<any> {}

	public static initialize(): void {
		console.log('[WakaTime] Initializing WakaTime plugin')
		console.log(`[WakaTime] Heartbeat interval: ${CONFIG.HEARTBEAT_INTERVAL}ms`)

		Storage.restoreConfigs()
		this.init()
	}

	public static stop(): void {
		console.log('[WakaTime] Stopping WakaTime interval')
		clearInterval(this.intervalRef)
	}

	public static init(): void {
		const isDisabled = !Storage.isExtensionEnabled()
		if (isDisabled) {
			this.stop()
			updateConnectionStatus(STATUS.DISCONNECTED)
			return
		}

		this.intervalRef = setInterval(async () => {
			console.log('[WakaTime] Created heartbeat interval')
			if (isDisabled) return

			const activeFile = await this.getActiveFile()
			console.log('[Wakatime] Active file:', activeFile)
			if (!activeFile) return

			const heartbeatResponse = await sendHeartbeat({
				file: activeFile,
				time: Date.now(),
			})

			console.log('[Wakatime] Heartbeat response:', heartbeatResponse)

			if (isDisabled) {
				updateConnectionStatus(STATUS.DISCONNECTED)
				return
			}
			updateConnectionStatus(heartbeatResponse)
		}, CONFIG.HEARTBEAT_INTERVAL)
	}

	public static initListeners(): void {
		document
			.getElementById(ELEMENTS.API_KEY_SAVE_BTN)
			?.addEventListener('click', this.handleApiKeySaveClick)

		document
			.getElementById(ELEMENTS.EXTENSION_ENABLED_CHECKBOX)
			?.addEventListener('change', this.handleExtensionEnabledClick)

		// API URL listeners
		document
			.getElementById(ELEMENTS.API_URL_SAVE_BTN)
			?.addEventListener('click', this.handleApiUrlSaveClick)
		document
			.getElementById(ELEMENTS.API_URL_RESET_BTN)
			?.addEventListener('click', this.handleApiUrlResetClick)

		document
			.getElementById(ELEMENTS.CONFIG_SAVE_BTN)
			?.addEventListener('click', this.handleConfigSaveClick)

		document
			.getElementById(ELEMENTS.CONFIG_RESET_BTN)
			?.addEventListener('click', this.handleConfigResetClick)

		// Add paste button listeners
		document
			.getElementById('paste_key')
			?.addEventListener('click', () => this.handlePasteKeyClick())

		document
			.getElementById('paste_url')
			?.addEventListener('click', () => this.handlePasteUrlClick())

		isLastestVersion().then((isLatest) => {
			if (!isLatest)
				document.getElementById(ELEMENTS.EXTENSION_UPDATE_AVAILABLE).style.display = 'block'
		})
	}

	private static handleApiKeySaveClick = async (): Promise<void> => {
		console.log('[WakaTime] Updating API key')
		await Storage.saveSecureKey()
		this.init()
	}

	private static handleExtensionEnabledClick = (): void => {
		Storage.saveIsEnabled()
		this.init()
	}

	private static handleConfigSaveClick = (): void => {
		Storage.manageStorage()
		this.init()
	}

	private static handleConfigResetClick = (): void => {
		Storage.manageStorage(true)
		this.init()
	}

	private static handleApiUrlSaveClick = (): void => {
		Storage.saveApiUrl()
	}

	private static handleApiUrlResetClick = (): void => {
		const urlInput = document.getElementById(ELEMENTS.API_URL_INPUT) as HTMLInputElement
		urlInput.value = CONFIG.WAKATIME_API_ENDPOINT
		Storage.saveApiUrl()
	}

	private static async handlePasteKeyClick(): Promise<void> {
		try {
			const text = await this.getClipboardText()
			const input = document.getElementById('waka_key') as HTMLElement
			this.focusRealInput(input)
			if (text) {
				;(input as HTMLInputElement).value = text
				input.dispatchEvent(new Event('input', { bubbles: true }))
			} else {
				this.showError('Unable to read clipboard. Please input manually into the field.')
			}
		} catch (error) {
			this.showError('Unable to read clipboard. Please input manually into the field.')
			const input = document.getElementById('waka_key') as HTMLElement
			this.focusRealInput(input)
		}
	}

	private static async handlePasteUrlClick(): Promise<void> {
		try {
			const text = await this.getClipboardText()
			const input = document.getElementById('waka_api_url') as HTMLElement
			this.focusRealInput(input)
			if (text) {
				;(input as HTMLInputElement).value = text
				input.dispatchEvent(new Event('input', { bubbles: true }))
			} else {
				this.showError('Unable to read clipboard. Please input manually into the field.')
			}
		} catch (error) {
			this.showError('Unable to read clipboard. Please input manually into the field.')
			const input = document.getElementById('waka_api_url') as HTMLElement
			this.focusRealInput(input)
		}
	}

	private static async getClipboardText(): Promise<string> {
		// Try modern clipboard API first (UXP)
		if (navigator.clipboard?.readText) {
			try {
				const text = await navigator.clipboard.readText()
				if (text) return text
			} catch (e) {
				console.warn('[WakaTime] navigator.clipboard.readText() failed:', e)
			}
		}

		// CEP environment
		if (window.cep) {
			try {
				// Some CEP hosts provide getClipboard()
				if (typeof window.cep.getClipboard === 'function') {
					const text = window.cep.getClipboard()
					if (text) return text
				}
				// Some provide clipboard.getData()
				if (window.cep.clipboard && typeof window.cep.clipboard.getData === 'function') {
					const text = window.cep.clipboard.getData()
					if (text) return text
				}
			} catch (e) {
				console.warn('[WakaTime] CEP clipboard access failed:', e)
			}
		}

		// If all else fails, show error and instruct user to paste manually
		this.showError('Unable to read clipboard. Please paste manually into the field.')
		return ''
	}

	private static showError(message: string): void {
		const errorElement = document.getElementById(ELEMENTS.INPUT_ERROR_MESSAGE)
		if (errorElement) {
			errorElement.textContent = message
			setTimeout(() => {
				errorElement.textContent = ''
			}, 5000)
		}
	}

	private static focusRealInput(input: HTMLElement | null) {
		if (!input) return
		// For Spectrum Web Components, focus the shadow input
		const realInput = (input.shadowRoot as ShadowRoot)?.querySelector('input')
		if (realInput) {
			;(realInput as HTMLInputElement).focus()
		} else {
			;(input as HTMLInputElement).focus()
		}
	}
}

