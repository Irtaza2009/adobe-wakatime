import { CONFIG, STATUS } from './constants'
import { HostInformation } from './utils'
import Storage from './storage'
import { machine } from 'os'

interface HeartbeatData {
	file: string
	time: number
}
export const sendHeartbeat = async (data: HeartbeatData): Promise<STATUS> => {
	const { file, time } = data
	console.log('[WakaTime] Sending heartbeat:', file)

	const apiKey = Storage.getApiKey()
	if (!apiKey) {
		console.error('[WakaTime] No API key provided for sendHearteat()')
		return STATUS.NO_API_KEY_PROVIDED
	}

	const project = Storage.getProjectName()

	const apiUrl = Storage.getApiUrl()

	const response = await fetch(`${apiUrl}/users/current/heartbeats?api_key=${apiKey}`, {
		method: 'POST',
		credentials: 'omit',
		redirect: 'follow',
		body: JSON.stringify({
			//* Time must be in UNIX timestamp
			time: Math.floor(time / 1000),
			entity: file,
			type: 'file',
			project: project || `Adobe ${HostInformation.APP_NAME}`,
			category: 'designing',
			language: HostInformation.APP_NAME,
			plugin: HostInformation.PLUGIN_NAME,
			editor: HostInformation.APP_NAME || 'Adobe',
			operating_system: HostInformation.OS_NAME || navigator.platform || 'Unknown',
			machine: HostInformation.HOST_NAME || machine(),
			line_additions: 0,
			line_deletions: 0,
			lineno: 1,
			cursorpos: 1,
			user_agent: HostInformation.USER_AGENT,
		}),
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': HostInformation.USER_AGENT,
			// Machine header must be checked, if not, any value will be stringified
			...(HostInformation.HOST_NAME && {
				'X-Machine-Name': HostInformation.HOST_NAME,
			}),
		},
	})
		.then((res) => {
			console.log('[WakaTime] Heartbeat received', res)
			console.log('[WakaTime] User-Agent:', HostInformation.USER_AGENT)
			if (res.status === 500) return STATUS.SERVER_ERROR
			else if (res.status === 401 || res.status === 403) return STATUS.INVALID_API_KEY
			else if (!res.ok) return STATUS.BAD_REQUEST

			return STATUS.CONNECTED
		})
		.catch((err) => {
			console.error('[WakaTime] Fetch error\n', err)
			return STATUS.BAD_REQUEST
		})

	return response
}

