import { CONFIG, ELEMENTS } from './constants'

export default class Storage {
	private static API_CACHE: string | null

	public static saveApiUrl(): void {
		const urlInput = document.getElementById(ELEMENTS.API_URL_INPUT) as HTMLInputElement
		const apiUrl = urlInput?.value?.trim()

		if (!apiUrl) {
			console.log('[WakaTime] Cleared API URL')
			urlInput.value = ''
			localStorage.removeItem(CONFIG.STORAGE_API_URL)
			return
		}

		// Basic URL validation
		try {
			new URL(apiUrl)
			console.log(`[WakaTime] Saving API URL: "${apiUrl}"`)
			localStorage.setItem(CONFIG.STORAGE_API_URL, apiUrl)
		} catch (e) {
			console.error('[WakaTime] Invalid API URL', e)
			urlInput.setAttribute('invalid', 'true')
		}

		urlInput.setAttribute('valid', 'true')
		setTimeout(() => {
			urlInput.removeAttribute('valid')
		}, 1500)
	}

	public static getApiUrl(): string {
		const savedUrl = localStorage.getItem(CONFIG.STORAGE_API_URL)
		const urlInput = document.getElementById(ELEMENTS.API_URL_INPUT) as HTMLInputElement

		if (savedUrl) {
			if (urlInput && urlInput.value !== savedUrl) {
				urlInput.value = savedUrl
			}
			return savedUrl
		}

		// Only set default if input is empty
		if (urlInput && !urlInput.value) {
			urlInput.value = CONFIG.WAKATIME_API_ENDPOINT
		}
		return CONFIG.WAKATIME_API_ENDPOINT
	}

	public static restoreConfigs(): void {
		// The idea is to sync the saved settings with the text inputs at startup
		Storage.getApiKey()
		Storage.getProjectName()
		Storage.getMachineName()
		Storage.getApiUrl()
	}

	public static async saveSecureKey(): Promise<void> {
		const userInput = document.getElementById(ELEMENTS.API_KEY_INPUT) as HTMLInputElement
		const errorMessage = document.getElementById(ELEMENTS.INPUT_ERROR_MESSAGE)

		//* MAC bug fix: can't read input as password.
		userInput.type = 'text'
		const key = userInput.value
		userInput.type = 'password'

		// API keys *can* start with waka_
		const re = /^(waka_)?[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i

		if (!key.length || !re.test(key)) {
			userInput.setAttribute('invalid', 'true')
			errorMessage.textContent = 'Invalid API key'
			return
		}

		userInput.removeAttribute('invalid')
		errorMessage.textContent = ''

		//* Visual feedback that the key saved
		userInput.setAttribute('valid', 'true')
		setTimeout(() => {
			userInput.removeAttribute('valid')
		}, 1500)

		Storage.API_CACHE = key
		localStorage.setItem(CONFIG.STORAGE_API_KEY, key.trim())
	}

	public static getApiKey(): string {
		if (Storage.API_CACHE) return Storage.API_CACHE

		const secureKey = localStorage.getItem(CONFIG.STORAGE_API_KEY)
		Storage.API_CACHE = secureKey

		// Always sync the api key value
		const userInput = document.getElementById(ELEMENTS.API_KEY_INPUT) as HTMLInputElement
		if (userInput && secureKey) userInput.value = secureKey

		return secureKey
	}

	public static saveIsEnabled(): void {
		const checkbox = document.getElementById(
			ELEMENTS.EXTENSION_ENABLED_CHECKBOX
		) as HTMLInputElement
		const isEnabled = checkbox.checked

		console.log(`[WakaTime] Extension ${isEnabled ? 'enabled' : 'disabled'}`)
		localStorage.setItem(CONFIG.STORAGE_PLUGIN_ENABLED, isEnabled.toString())
	}

	public static isExtensionEnabled(): boolean {
		const keyValue = localStorage.getItem(CONFIG.STORAGE_PLUGIN_ENABLED)
		const isEnabled = keyValue === null ? true : JSON.parse(keyValue)

		// Always sync the checkbox value
		const checkbox = document.getElementById(
			ELEMENTS.EXTENSION_ENABLED_CHECKBOX
		) as HTMLInputElement

		if (checkbox) checkbox.checked = isEnabled

		return isEnabled
	}

	public static saveProjectName(): void {
		const projectInput = document.getElementById(ELEMENTS.API_PROJECTNAME) as HTMLInputElement
		const projectName = projectInput?.value?.trim()

		if (!projectName) {
			console.log('[WakaTime] Cleared project name')
			projectInput.value = ''
			localStorage.removeItem(CONFIG.STORAGE_PROJECTNAME)
			return
		}

		console.log(`[Wakatime] Saving project name: "${projectName}"`)
		localStorage.setItem(CONFIG.STORAGE_PROJECTNAME, projectName)
	}

	public static getProjectName(): string | null {
		console.log('[Wakatime] Requesting project name...')

		const projectValue = localStorage.getItem(CONFIG.STORAGE_PROJECTNAME)
		const project = projectValue?.length ? projectValue : null

		// Always sync the input value
		const input = document.getElementById(ELEMENTS.API_PROJECTNAME) as HTMLInputElement
		if (input && project) input.value = project

		return project
	}

	public static getMachineName(): string | null {
		console.log('[Wakatime] Requesting machine name...')

		const machineValue = localStorage.getItem(CONFIG.STORAGE_MACHINE)
		const machine = machineValue?.length ? machineValue : null

		// Always sync the input value
		const input = document.getElementById(ELEMENTS.API_HOSTNAME) as HTMLInputElement
		if (input && machine) input.value = machine

		console.log('[Wakatime] Machine name:', machine)
		return machine
	}

	private static saveMachine(): void {
		const machineInput = document.getElementById(ELEMENTS.API_HOSTNAME) as HTMLInputElement
		const machineName = machineInput?.value?.trim()

		if (!machineName) return

		console.log(`[Wakatime] Saving machine name as "${machineName}"`)
		localStorage.setItem(CONFIG.STORAGE_MACHINE, machineName)
	}

	public static manageStorage(shouldReset: boolean = false): void {
		if (shouldReset) {
			console.log('[Wakatime] Resetting configuration...')

			localStorage.removeItem(CONFIG.STORAGE_MACHINE)
			localStorage.removeItem(CONFIG.STORAGE_PROJECTNAME)

			const machineNameInput = document.getElementById(ELEMENTS.API_HOSTNAME) as HTMLInputElement
			if (machineNameInput) machineNameInput.value = ''

			const projectNameInput = document.getElementById(ELEMENTS.API_PROJECTNAME) as HTMLInputElement
			projectNameInput.value = ''

			return
		}

		console.log('[Wakatime] Saving configuration...')
		Storage.saveMachine()
		Storage.saveProjectName()
	}
}

export const ProjectTimeTracker = {
	get(project: string): number {
		const raw = localStorage.getItem(`wakatime_project_time_${project}`)
		return raw ? parseInt(raw, 10) : 0
	},

	set(project: string, timeInMs: number): void {
		localStorage.setItem(`wakatime_project_time_${project}`, timeInMs.toString())
	},

	increment(project: string, deltaMs: number): void {
		const current = this.get(project)
		this.set(project, current + deltaMs)
	},
}

