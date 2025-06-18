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
		// Add visual feedback if needed
	}

	private static handleApiUrlResetClick = (): void => {
		const urlInput = document.getElementById(ELEMENTS.API_URL_INPUT) as HTMLInputElement
		urlInput.value = CONFIG.WAKATIME_API_ENDPOINT
		Storage.saveApiUrl()
	}
}

