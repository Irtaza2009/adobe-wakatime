export const PLUGIN = {
	VERSION: require('../package.json').version.toString(),
	UPDATE_URL: 'https://api.github.com/repos/Irtaza2009/adobe-wakatime/releases/latest',
}

export enum CONFIG {
	WAKATIME_API_ENDPOINT = 'https://api.wakatime.com/api/v1',
	STORAGE_API_URL = 'secure_wakatime_api_url',
	STORAGE_PLUGIN_ENABLED = 'secure_wakatime_enabled',
	STORAGE_API_KEY = 'secure_wakatime_key',
	STORAGE_MACHINE = 'secure_wakatime_machine',
	STORAGE_PROJECTNAME = 'secure_wakatime_project_name',
	HEARTBEAT_INTERVAL = 10000, //* 10sec interval
}

export enum ELEMENTS {
	API_KEY_INPUT = 'waka_key',
	API_URL_INPUT = 'waka_api_url',
	API_HOSTNAME = 'waka_api_hostname',
	API_PROJECTNAME = 'waka_api_projectname',
	API_KEY_SAVE_BTN = 'waka_submitkey',
	API_URL_RESET_BTN = 'api_url_reset',
	API_URL_SAVE_BTN = 'api_url_save',
	CONFIG_RESET_BTN = 'config_reset',
	CONFIG_SAVE_BTN = 'config_save',
	INPUT_ERROR_MESSAGE = 'waka_error_msg',
	API_CONNECTION_STATUS = 'connectionStatus',
	EXTENSION_ENABLED_CHECKBOX = 'waka_enabled',
	EXTENSION_UPDATE_AVAILABLE = 'waka_update_available',
}

export enum STATUS {
	BAD_REQUEST,
	SERVER_ERROR,
	INVALID_API_KEY,
	NO_API_KEY_PROVIDED,
	UNAUTHORIZED,
	DISCONNECTED,
	CONNECTED,
}

