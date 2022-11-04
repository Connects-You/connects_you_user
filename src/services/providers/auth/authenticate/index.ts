import { AuthenticateRequest } from '@adarsh-mishra/connects_you_services/services/auth/AuthenticateRequest';
import { AuthenticateResponse } from '@adarsh-mishra/connects_you_services/services/auth/AuthenticateResponse';
import { AuthTypeEnum } from '@adarsh-mishra/connects_you_services/services/auth/AuthTypeEnum';
import { ResponseStatusEnum } from '@adarsh-mishra/connects_you_services/services/auth/ResponseStatusEnum';
import { TokenTypesEnum } from '@adarsh-mishra/connects_you_services/services/auth/TokenTypesEnum';
import { aesEncryptData, hashData, isEmptyEntity, jwt } from '@adarsh-mishra/node-utils/commonHelpers';
import { BadRequestError, NotFoundError } from '@adarsh-mishra/node-utils/httpResponses';
import { createSessionTransaction } from '@adarsh-mishra/node-utils/mongoHelpers';
import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js';

import { errorCallback } from '../../../../helpers/errorCallback';
import { fetchUserDetails } from '../../../../helpers/fetchUserDetails';

import { login } from './login';
import { signup } from './signup';
import { validateOAuth2Token } from './validOAuth2Token';

export const authenticate = async (
	req: ServerUnaryCall<AuthenticateRequest, AuthenticateResponse>,
	callback: sendUnaryData<AuthenticateResponse>,
) => {
	try {
		const { token, publicKey, fcmToken, clientMetaData } = req.request;
		if (!token || !publicKey || !fcmToken) {
			throw new BadRequestError({
				error: 'Invalid request. Please provide token, publicKey and fcmToken',
			});
		}

		const oAuth2Response = await validateOAuth2Token(token);
		if (!oAuth2Response || !oAuth2Response.name || !oAuth2Response.email) {
			throw new BadRequestError({ error: 'Token not provided' });
		}

		const userEmailHash = hashData(oAuth2Response.email, process.env.HASH_KEY);

		const existedUser = await fetchUserDetails({ emailHash: userEmailHash });

		const loginMetaData = clientMetaData
			? aesEncryptData(JSON.stringify(clientMetaData), process.env.ENCRYPT_KEY) ?? undefined
			: undefined;

		const { method, userLoginHistoryResponse, userResponse } = await createSessionTransaction(async (session) => {
			if (existedUser) {
				const data = await login({
					existedUserId: existedUser._id,
					loginMetaData,
					fcmToken: fcmToken!,
					session,
				});
				await session.commitTransaction();
				return data;
			} else {
				const data = await signup({
					oAuth2Response,
					publicKey: publicKey!,
					userEmailHash,
					fcmToken: fcmToken!,
					session,
					loginMetaData,
				});
				await session.commitTransaction();
				return data;
			}
		});

		if (isEmptyEntity(userResponse) || isEmptyEntity(userLoginHistoryResponse)) {
			throw new NotFoundError({ error: 'No data found' });
		}

		const payload = {
			userId: userResponse.userId,
			loginId: userLoginHistoryResponse.loginId,
			type: TokenTypesEnum[TokenTypesEnum.INITIAL_TOKEN],
		};

		const tokenForResponse = jwt.sign(payload, process.env.SECRET, { expiresIn: '30d' });

		return callback(null, {
			responseStatus: ResponseStatusEnum.SUCCESS,
			data: {
				method,
				user: {
					token: tokenForResponse,
					publicKey: method === AuthTypeEnum[AuthTypeEnum.LOGIN] ? userResponse.publicKey : undefined,
					name: userResponse.name,
					email: userResponse.email,
					photoUrl: userResponse.photoUrl,
					userId: userResponse.userId,
				},
				loginInfo: {
					loginId: userLoginHistoryResponse.loginId,
					loginMetaData: clientMetaData,
					userId: userLoginHistoryResponse.userId,
					isValid: true,
					createdAt: userLoginHistoryResponse.createdAt,
				},
			},
		});
	} catch (error) {
		return errorCallback(callback, error);
	}
};