import { Injectable } from '@nestjs/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { BaseModel } from '@/orm/base.model';
import { AuthEntity } from '@/auth/entities/auth.entity';

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

/**
 * @dev Trigger create schema.
 */
export const AuthDataSchema = SchemaFactory.createForClass(AuthModel);

/**
 * @dev Trigger create index if not exists
 */
AuthDataSchema.index({ id: 'asc' }, { unique: true });

/**
 * @dev Define generic type for typescript reference.
 */
export type AuthDataDocument = Document & AuthEntity;
