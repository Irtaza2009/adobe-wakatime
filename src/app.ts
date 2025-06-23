import './styles.css'
import { ELEMENTS, CONFIG, STATUS } from './constants'
import { updateConnectionStatus, isLastestVersion, updateProjectTimeDisplay } from './utils'
import { sendHeartbeat } from './wakatime'
import Storage from './storage'
import { ProjectTimeTracker } from './storage'

export class WakaTimePlugin {
	private static intervalRef: NodeJS.Timer | null = null

	public static async getActiveFile(): Promise<any> {}

	public static initialize(): void {
		console.log('[WakaTime] Initializing WakaTime plugin')
		console.log(`[WakaTime] Heartbeat interval: ${CONFIG.HEARTBEAT_INTERVAL}ms`)

		Storage.restoreConfigs()
		this.init()

		// Show panel warning popup if needed
		const showWarning = localStorage.getItem('wakapopup-hide') !== 'true'
		if (showWarning) {
			document.getElementById('wakapopup-overlay')?.setAttribute('style', 'display: flex')
		}
		document.getElementById('wakatime-popup-ok')?.addEventListener('click', () => {
			const checkbox = document.getElementById('wakatime-hide-warning') as HTMLInputElement
			if (checkbox?.checked) {
				localStorage.setItem('wakapopup-hide', 'true')
			}
			document.getElementById('wakapopup-overlay')?.setAttribute('style', 'display: none')
		})

		// Eye icon toggle for API key visibility
		const toggleBtn = document.getElementById('toggle-key-visibility')
		const apiKeyInput = document.getElementById('waka_key') as HTMLInputElement
		const eyeIcon = document.getElementById('eye-icon') as unknown as SVGElement
		if (toggleBtn && apiKeyInput && eyeIcon) {
			toggleBtn.addEventListener('click', () => {
				const isPassword = apiKeyInput.type === 'password'
				apiKeyInput.type = isPassword ? 'text' : 'password'
				eyeIcon.innerHTML = isPassword
					? `<path d="M10 4C5 4 1.73 8.11 1.13 8.93a1.25 1.25 0 0 0 0 1.54C1.73 11.89 5 16 10 16s8.27-4.11 8.87-4.93a1.25 1.25 0 0 0 0-1.54C18.27 8.11 15 4 10 4Zm0 10c-3.31 0-6.13-2.64-7.19-4C3.87 8.64 6.69 6 10 6s6.13 2.64 7.19 4C16.13 11.36 13.31 14 10 14Zm0-7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" fill="#888"/>`
					: `<path d="M2.293 2.293a1 1 0 0 1 1.414 0l14 14a1 1 0 1 1-1.414 1.414l-2.13-2.13C12.77 16.19 11.41 16.5 10 16.5c-5 0-8.27-4.11-8.87-4.93a1.25 1.25 0 0 1 0-1.54c.36-.47 1.09-1.41 2.13-2.36L2.293 2.293ZM10 14.5c1.02 0 2.01-.17 2.93-.48l-1.52-1.52A3 3 0 0 1 7.5 10c0-.41.08-.8.22-1.16l-1.6-1.6C4.87 8.64 2.05 11.36 2.05 11.36 3.11 12.73 6.69 14.5 10 14.5Zm7.95-3.14c-.36.47-1.09 1.41-2.13 2.36l-1.44-1.44c.09-.28.14-.58.14-.89a3 3 0 0 0-3-3c-.31 0-.61.05-.89.14l-1.44-1.44C7.99 5.81 9.36 5.5 10 5.5c3.31 0 6.13 2.64 7.19 4-.36.47-1.09 1.41-2.13 2.36l1.44 1.44c1.04-.95 1.77-1.89 2.13-2.36a1.25 1.25 0 0 0 0-1.54Z" fill="#888"/>`
			})
		}
	}

	public static stop(): void {
		console.log('[WakaTime] Stopping WakaTime interval')
		clearInterval(this.intervalRef)
	}

	private static lastSentFile: string | null = null
	private static lastModifiedTime: number = 0
	private static lastHeartbeatTime: number | null = null
	private static lastStatus: STATUS = STATUS.DISCONNECTED

	public static init(): void {
		const isDisabled = !Storage.isExtensionEnabled()
		if (isDisabled) {
			this.stop()
			updateConnectionStatus(STATUS.DISCONNECTED)
			return
		}

		if (this.lastStatus !== STATUS.CONNECTED) {
			this.showCountdown()
		}

		this.intervalRef = setInterval(async () => {
			if (!Storage.isExtensionEnabled()) return

			const file = await this.getActiveFile()
			if (!file) return

			const now = Date.now()
			const project = Storage.getProjectName() || 'Unknown Project'

			try {
				const fs = require('fs')
				const stats = fs.statSync(file)
				const mtimeMs = stats.mtimeMs

				const isNewFile = file !== this.lastSentFile
				const wasModified = mtimeMs > this.lastModifiedTime

				// Always send heartbeat if last status is not CONNECTED
				const shouldSendHeartbeat = this.lastStatus !== STATUS.CONNECTED || isNewFile || wasModified

				if (shouldSendHeartbeat) {
					const previousHeartbeat = this.lastHeartbeatTime
					this.lastHeartbeatTime = now

					if (previousHeartbeat) {
						const delta = now - previousHeartbeat
						if (delta < CONFIG.HEARTBEAT_INTERVAL * 5) {
							if (this.lastStatus === STATUS.CONNECTED) {
								ProjectTimeTracker.increment(project, delta)
								console.log(`[WakaTime] Incremented project time for "${project}" by ${delta}ms`)
							}
						}
					}

					const heartbeatResponse = await sendHeartbeat({
						file,
						time: now,
					})

					this.lastSentFile = file
					this.lastModifiedTime = mtimeMs

					updateConnectionStatus(heartbeatResponse)
					updateProjectTimeDisplay(project)

					this.lastStatus = heartbeatResponse

					const isConnected = heartbeatResponse === STATUS.CONNECTED
					this.showCountdownResult(isConnected)
				}
			} catch (err) {
				console.warn('[WakaTime] Could not read file timestamp:', err)
				this.lastStatus = STATUS.DISCONNECTED
			}
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

	private static countdownTimer: number | null = null
	private static countdownValue: number = CONFIG.HEARTBEAT_INTERVAL / 1000

	private static showCountdown() {
		const el = document.getElementById('waka-countdown')
		if (!el) return
		this.countdownValue = CONFIG.HEARTBEAT_INTERVAL / 1000 - 2
		el.style.display = 'inline'
		el.textContent = `Next check in ${this.countdownValue}s`
		this.clearCountdown()
		this.countdownTimer = window.setInterval(() => {
			this.countdownValue--
			if (this.countdownValue > 0) {
				el.textContent = `Next check in ${this.countdownValue}s`
			} else {
				this.clearCountdown()
				el.textContent = 'Reconnecting...'
				setTimeout(() => {
					el.textContent = "Couldn't connect"
					setTimeout(() => {
						el.style.display = 'none'
						this.showCountdown()
					}, 2000)
				}, 1000)
			}
		}, 1000)
	}

	private static showCountdownResult(success: boolean) {
		const el = document.getElementById('waka-countdown')
		if (!el) return
		this.clearCountdown()
		if (success) {
			el.textContent = 'Connected!'
			setTimeout(() => {
				el.style.display = 'none'
			}, 1500)
		} else {
			el.textContent = "Couldn't connect"
			setTimeout(() => {
				el.style.display = 'none'
				this.showCountdown()
			}, 2000)
		}
	}

	private static clearCountdown() {
		if (this.countdownTimer) {
			clearInterval(this.countdownTimer)
			this.countdownTimer = null
		}
	}
}

