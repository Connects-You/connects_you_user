import { ResponseStatusEnum } from '@adarsh-mishra/connects_you_services/services/user/ResponseStatusEnum';
import { UserLoginInfoRequest } from '@adarsh-mishra/connects_you_services/services/user/UserLoginInfoRequest';
import { UserLoginInfoResponse } from '@adarsh-mishra/connects_you_services/services/user/UserLoginInfoResponse';
import { aesDecryptData, isEmptyEntity } from '@adarsh-mishra/node-utils/commonHelpers';
import { BadRequestError, NotFoundError } from '@adarsh-mishra/node-utils/httpResponses';
import { MongoObjectId } from '@adarsh-mishra/node-utils/mongoHelpers';
import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js';

import { errorCallback } from '../../../../helpers/errorCallback';
import { UserLoginHistoryModel } from '../../../../models';

export const getUserLoginInfo = async (
	req: ServerUnaryCall<UserLoginInfoRequest, UserLoginInfoResponse>,
	callback: sendUnaryData<UserLoginInfoResponse>,
) => {
	try {
		const { loginId, userId } = req.request;
		if (!loginId || !userId) {
			throw new BadRequestError({ error: 'Invalid request. Please provide loginId and userId' });
		}

		const loginIdObj = MongoObjectId(loginId);
		const userIdObj = MongoObjectId(userId);

		if (!loginIdObj || !userIdObj) {
			throw new BadRequestError({ error: 'Invalid request. Please provide valid loginId and userId' });
		}

		const userLoginInfo = await UserLoginHistoryModel.findOne({
			_id: loginIdObj,
			userId: userIdObj,
			isValid: true,
		})
			.lean()
			.exec();

		if (isEmptyEntity(userLoginInfo)) throw new NotFoundError({ error: 'user login info not found' });

		return callback(null, {
			responseStatus: ResponseStatusEnum.SUCCESS,
			data: {
				userLoginInfo: {
					loginMetaData: JSON.parse(
						aesDecryptData(userLoginInfo!.loginMetaData, process.env.ENCRYPT_KEY) ?? '{}',
					),
					userId: userLoginInfo!.userId.toString(),
					loginId: userLoginInfo!._id.toString(),
					createdAt: userLoginInfo!.createdAt?.toISOString(),
					isValid: userLoginInfo!.isValid,
				},
			},
		});
	} catch (error) {
		return errorCallback(callback, error);
	}
};