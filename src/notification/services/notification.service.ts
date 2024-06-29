import {
  UserDeviceDocument,
  UserDeviceModel,
} from '@/orm/model/user-device.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as firebaseAdmin from 'firebase-admin';
import { Model } from 'mongoose';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(UserDeviceModel.name)
    private readonly userDeviceRepo: Model<UserDeviceDocument>,
  ) {}

  async sendNotification(token: string, title: string, body: string) {
    const message = {
      notification: {
        title,
        body,
      },
      token,
    };

    try {
      await firebaseAdmin.messaging().send(message);
      console.log('Notification sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * @dev send multiple notifications
   * @param tokens
   * @param title
   * @param body
   */
  async sendNotifications(tokens: string[], title: string, body: string) {
    const messages = tokens.map((token) => ({
      notification: {
        title,
        body,
      },
      token,
    }));

    const response = await firebaseAdmin.messaging().sendAll(messages);
    console.log(
      'Notifications sent successfully:',
      response.successCount,
      'ent, ',
      response.failureCount,
      'failed',
    );
  }

  async sendNotificationToAddress(
    ownerAddress: string,
    title: string,
    body: string,
  ) {
    const userDeviceTokens = await this.listUserDeviceTokens(ownerAddress);

    const messages = userDeviceTokens.map((token) => ({
      notification: {
        title,
        body,
      },
      token,
    }));

    await firebaseAdmin.messaging().sendAll(messages);
    console.log('Notifications sent successfully');
  }

  async listUserDeviceTokens(ownerAddress: string): Promise<string[]> {
    const userDevices = await this.userDeviceRepo.find({ ownerAddress }).exec();
    return userDevices.map((userDevice) => userDevice.deviceToken);
  }
}
