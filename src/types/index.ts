/* eslint-disable @typescript-eslint/naming-convention */

export * from './user';
export * from './userLoginHistory';
export * from './userRefreshToken';

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			URL: string;
			GOOGLE_CLIENT_ID: string;
			SECRET: string;
			ENCRYPT_KEY: string;
			HASH_KEY: string;
			API_KEY: string;
			ENV: 'dev' | 'prod';
			DEV_MONGO_URL: string;
			DEV_REDIS_HOST: string;
			DEV_REDIS_PORT: number;
			DEV_REDIS_DB: number;
			PROD_MONGO_URL: string;
			PROD_REDIS_HOST: string;
			PROD_REDIS_PORT: number;
			PROD_REDIS_DB: number;
			PROD_REDIS_PASSWORD: string;
			PROD_REDIS_USERNAME: string;
			ROOM_SERVICE_URL: string;
			ROOM_SERVICE_API_KEY: string;
		}
	}
}
