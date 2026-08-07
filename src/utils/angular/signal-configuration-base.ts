/**
 * Base class for Angular Signal Configuration
 * Consolidates common signal configuration logic:
 * - File extension management
 * - Message placeholder handling
 * - Validation message templating
 */
import { AngularConfigurationBase } from './angular-configuration-base';
import { MessagePlaceholderHelper } from './message-placeholder-helper';

export abstract class SignalConfigurationBase extends AngularConfigurationBase {
  /**
   * Apply fileName placeholder to validation message object
   * RULE 2: Handles message objects with multiple properties containing placeholders
   */
  static buildMessageObject<T extends Record<string, string>>(
    messageTemplate: T,
    fileName: string
  ): T {
    return MessagePlaceholderHelper.buildMessageObject(
      messageTemplate,
      fileName,
      (message, fname) => this.applyFileNamePlaceholder(message, fname)
    );
  }
}
