import path from 'path';
import { Injectable } from '@nestjs/common';
import * as NodeMailer from 'nodemailer';
import * as EmailInstance from 'email-templates';
import { RegistryProvider, SystemConfig } from './registry.provider';

enum EmailTemplate {
  OTP_VERIFICATION = 'verify-email-otp',
}

@Injectable()
export class EmailProvider {
  private config: SystemConfig;
  constructor(private readonly registryProvider: RegistryProvider) {
    this.config = registryProvider.getConfig();
  }

  /**
   * This function is used to send email.
   *  Steps:
   *     1. Create an instance of EmailInstance.
   *     2. Send email.
   * @param templateName
   * @param context
   * @param sendTo
   * @param attachments
   * @returns
   */
  public sendEmail<T>(
    templateName: EmailTemplate,
    context: T,
    sendTo: string[],
    attachments: any[] = [],
  ) {
    const emailInstance = new EmailInstance({
      message: {
        from: `${this.config.SMTP_EMAIL_FROM_EMAIL_NAME} <${this.config.SMTP_EMAIL_FROM_EMAIL}>`,
        sender: this.config.SMTP_EMAIL_FROM_EMAIL,
        replyTo: this.config.SMTP_EMAIL_FROM_EMAIL,
        inReplyTo: this.config.SMTP_EMAIL_FROM_EMAIL,
      },
      send: true,
      transport: this.getTransporter(),
    });

    return emailInstance.send({
      template: path.join(
        __dirname,
        '../../assets/email-templates/',
        templateName,
      ),
      message: {
        to: sendTo,
        attachments,
      },
      locals: context as any,
    });
  }

  /**
   * This function is used to get the transporter.
   * @returns
   */
  private getTransporter() {
    return NodeMailer.createTransport({
      host: this.config.SMTP_EMAIL_HOST,
      port: Number(this.config.SMTP_EMAIL_PORT),
      secure: Boolean('true'),
      auth: {
        user: this.config.SMTP_EMAIL_USERNAME,
        pass: this.config.SMTP_EMAIL_PASSWORD,
      },
    });
  }
}
