import { IsString, IsEmail, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(3, 100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 50)
  password: string;
}