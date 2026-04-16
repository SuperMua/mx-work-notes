import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

import { emailMessage, minLengthMessage, requiredMessage, stringMessage } from '../../common/validation-messages';

export class RegisterDto {
  @IsEmail({}, emailMessage('邮箱地址'))
  email!: string;

  @IsString(stringMessage('密码'))
  @MinLength(8, minLengthMessage('密码', 8))
  password!: string;

  @IsOptional()
  @IsString(stringMessage('姓名'))
  @IsNotEmpty(requiredMessage('姓名'))
  name?: string;
}

export class LoginDto {
  @IsEmail({}, emailMessage('邮箱地址'))
  email!: string;

  @IsString(stringMessage('密码'))
  @MinLength(8, minLengthMessage('密码', 8))
  password!: string;
}

export class RefreshDto {
  @IsString(stringMessage('刷新令牌'))
  @IsNotEmpty(requiredMessage('刷新令牌'))
  refreshToken!: string;
}

export class LogoutDto {
  @IsString(stringMessage('刷新令牌'))
  @IsNotEmpty(requiredMessage('刷新令牌'))
  refreshToken!: string;
}
