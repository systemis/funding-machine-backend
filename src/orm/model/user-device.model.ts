import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from '../base.model';
import { UserDeviceEntity } from '@/portfolio/entities/user-device.entity';

@Schema({ collection: 'user_devices' })
export class UserDeviceModel extends BaseModel implements UserDeviceEntity {
  @Prop({ required: true, index: true })
  ownerAddress: string;

  @Prop({ required: true, unique: true })
  deviceToken: string;
}

/**
 * @dev Trigger create schema.
 */
export const UserDeviceSchema = SchemaFactory.createForClass(UserDeviceModel);

export type UserDeviceDocument = Document & UserDeviceEntity;
