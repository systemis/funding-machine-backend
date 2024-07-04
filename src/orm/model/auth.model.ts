import { Injectable } from '@nestjs/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { BaseModel } from '@/orm/base.model';
import { AuthChallengeEntity, AuthEntity } from '@/auth/entities/auth.entity';

@Injectable()
@Schema({ collection: 'auth', timestamps: true, autoIndex: true })
export class AuthModel extends BaseModel implements AuthEntity {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true, unique: true })
  walletAddress: string;

  @Prop({ required: true })
  email: string;
}

@Injectable()
@Schema({ collection: 'auth-challenge', timestamps: true, autoIndex: true })
export class AuthChallengeModel
  extends BaseModel
  implements AuthChallengeEntity
{
  @Prop({ required: true })
  challenge: string;

  @Prop({ required: true })
  isResolved: boolean;

  @Prop({ required: true })
  walletAddress: string;
}

/**
 * @dev Trigger create schema.
 */
export const AuthDataSchema = SchemaFactory.createForClass(AuthModel);
export const AuthChallengeSchema =
  SchemaFactory.createForClass(AuthChallengeModel);

/**
 * @dev Trigger create index if not exists
 */
AuthDataSchema.index({ id: 'asc' }, { unique: true });
AuthChallengeSchema.index({ walletAddress: 'asc' }, { unique: true });

/**
 * @dev Define generic type for typescript reference.
 */
export type AuthDataDocument = Document & AuthEntity;
export type AuthChallengeDocument = Document & AuthChallengeEntity;
