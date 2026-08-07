/**
 * Message Placeholder Helper
 * Shared utility for handling message placeholders across validation utilities
 */
export class MessagePlaceholderHelper {
  /**
   * Apply fileName placeholder to a single message
   */
  static applyFileNamePlaceholder(message: string, fileName: string): string {
    return message.replace('{fileName}', fileName);
  }

  /**
   * Build validation message with fileName placeholder (single message)
   */
  static buildMessage(messageTemplate: string, fileName: string): string {
    return this.applyFileNamePlaceholder(messageTemplate, fileName);
  }

  /**
   * Apply fileName placeholder to validation message object
   * RULE 2: Handles message objects with multiple properties containing placeholders
   */
  static buildMessageObject<T extends Record<string, string>>(
    messageTemplate: T,
    fileName: string,
    applyPlaceholder: (message: string, fileName: string) => string
  ): T {
    const result: Record<string, string> = {};
    for (const key in messageTemplate) {
      if (Object.prototype.hasOwnProperty.call(messageTemplate, key)) {
        const value = messageTemplate[key];
        if (value !== undefined) {
          result[key] = applyPlaceholder(value, fileName);
        }
      }
    }
    return result as T;
  }
}
