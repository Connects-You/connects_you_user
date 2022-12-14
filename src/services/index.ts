import { getServiceProvider } from '@adarsh-mishra/connects_you_services';
import { ProtoGrpcType as AuthProtoGrpcType } from '@adarsh-mishra/connects_you_services/services/auth';
import { ProtoGrpcType as UserProtoGrpcType } from '@adarsh-mishra/connects_you_services/services/user';
import { Server, ServerCredentials } from '@grpc/grpc-js';

import { handlerWrapper } from '../utils/grpcHandlersWrapper';

import { authenticate } from './providers/auth/authenticate';
import { refreshToken } from './providers/auth/refreshToken';
import { signout } from './providers/auth/signout';
import { updateFcmToken } from './providers/auth/updateFcmToken';
import { getAllUsers } from './providers/user/getAllUsers';
import { getUserDetails } from './providers/user/getUserDetails';
import { getUserLoginHistory } from './providers/user/getUserLoginHistory';
import { getUserLoginInfo } from './providers/user/getUserLoginInfo';

const ServiceProviders = {
	auth: (getServiceProvider('auth') as unknown as AuthProtoGrpcType).auth,
	user: (getServiceProvider('user') as unknown as UserProtoGrpcType).user,
};

export const createGRPCServer = () => {
	const server = new Server({ 'grpc.keepalive_permit_without_calls': 1, 'grpc.max_reconnect_backoff_ms': 10000 });

	server.addService(ServiceProviders.auth.AuthServices.service, {
		authenticate: handlerWrapper(authenticate),
		refreshToken: handlerWrapper(refreshToken),
		signout: handlerWrapper(signout),
		updateFcmToken: handlerWrapper(updateFcmToken),
	});
	server.addService(ServiceProviders.user.UserServices.service, {
		getUserLoginInfo: handlerWrapper(getUserLoginInfo),
		getUserDetails: handlerWrapper(getUserDetails),
		getAllUsers: handlerWrapper(getAllUsers),
		getUserLoginHistory: handlerWrapper(getUserLoginHistory),
	});

	server.bindAsync(process.env.URL.toString(), ServerCredentials.createInsecure(), (error, port) => {
		if (error) {
			throw error;
		}
		// eslint-disable-next-line no-console
		console.log(`Server running at ${port}`);
		server.start();
	});
};
