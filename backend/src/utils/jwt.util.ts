import jwt, { SignOptions } from 'jsonwebtoken';
import { ENV } from '../config/env';
import { IJwtPayload } from '../types';

export interface SignAuthTokenOptions {
  expiresIn?: SignOptions['expiresIn'];
  preserveExp?: number;
}

export const signAuthToken = (
  payload: IJwtPayload,
  signOptions?: SignAuthTokenOptions
): string => {
  const { iat: _iat, exp: _exp, ...cleanPayload } = payload;

  if (signOptions?.preserveExp !== undefined) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (signOptions.preserveExp <= nowSeconds) {
      const err: any = new Error('Session expired. Please log in again.');
      err.name = 'TokenExpiredError';
      err.statusCode = 401;
      throw err;
    }
    return jwt.sign(
      { ...cleanPayload, exp: signOptions.preserveExp },
      ENV.JWT_SECRET
    );
  }

  const options: SignOptions = {
    expiresIn: (signOptions?.expiresIn ?? ENV.JWT_EXPIRES_IN) as SignOptions['expiresIn'],
  };
  return jwt.sign(cleanPayload, ENV.JWT_SECRET, options);
};

export const verifyAuthToken = (token: string): IJwtPayload => {
  return jwt.verify(token, ENV.JWT_SECRET) as IJwtPayload;
};

