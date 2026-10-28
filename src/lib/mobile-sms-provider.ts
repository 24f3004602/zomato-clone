// Custom Mobile SMS Gateway Provider
// Sends SMS through your mobile phone connected to computer

export interface SmsProvider {
  sendOtp(input: { phone: string; code: string }): Promise<{ accepted: boolean; providerReference?: string }>;
  sendNotification(input: { phone: string; message: string }): Promise<{ accepted: boolean; providerReference?: string }>;
}

/**
 * Mobile SMS Gateway Provider
 * 
 * Setup:
 * 1. Install SMS Gateway app on your phone (Android/iOS)
 * 2. Enable HTTP API in app settings
 * 3. Configure MOBILE_GATEWAY_URL in .env.local
 * 4. Example: MOBILE_GATEWAY_URL=http://192.168.1.2:8080/send-sms
 */
export class MobileGatewaySmsProvider implements SmsProvider {
  private gatewayUrl: string;
  private apiToken: string;

  constructor(
    gatewayUrl: string = process.env.MOBILE_GATEWAY_URL || "http://100.121.108.165:8082",
    apiToken: string = process.env.MOBILE_GATEWAY_TOKEN || ""
  ) {
    this.gatewayUrl = gatewayUrl;
    this.apiToken = apiToken;
    
    if (!this.gatewayUrl) {
      throw new Error(
        "MOBILE_GATEWAY_URL not set. Configure your phone's SMS gateway app and set MOBILE_GATEWAY_URL in .env.local"
      );
    }

    if (!this.apiToken) {
      throw new Error(
        "MOBILE_GATEWAY_TOKEN not set. Get your API token from the SMS gateway app and set MOBILE_GATEWAY_TOKEN in .env.local"
      );
    }

    console.log(`[MOBILE SMS] Gateway initialized: ${this.gatewayUrl}`);
    console.log(`[MOBILE SMS] Authentication: Token-based (${this.apiToken.substring(0, 10)}...)`);
  }

  async sendOtp(input: { phone: string; code: string }) {
    const message = `Your TableTrail OTP is: ${input.code}. Valid for 5 minutes. Never share this code.`;
    return this.sendSms({
      phone: input.phone,
      message,
    });
  }

  async sendNotification(input: { phone: string; message: string }) {
    return this.sendSms({
      phone: input.phone,
      message: input.message,
    });
  }

  
private async sendSms(input: { phone: string; message: string }) {
  try {
    // Preserve the leading + in international phone numbers.
    const cleanPhone = input.phone.replace(/\s+/g, "");

    const response = await fetch(this.gatewayUrl, {
      method: "POST",
      headers: {
        // Use the raw local API key or cloud token.
        // Do not prepend "Bearer ".
        Authorization: this.apiToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: cleanPhone,
        message: input.message,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `SMS gateway returned HTTP ${response.status}: ${
          responseText || response.statusText
        }`
      );
    }

    let data: {
      success?: boolean;
      error?: string;
      message_id?: string;
      id?: string;
    } = {};

    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        // Some gateways may return plain text instead of JSON.
      }
    }

    if (data.success === false) {
      throw new Error(
        `SMS gateway error: ${data.error || "Unknown error"}`
      );
    }

    return {
      accepted: true,
      providerReference:
        data.message_id || data.id || `mobile_${Date.now()}`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error(`[MOBILE SMS] Failed: ${errorMessage}`);
    throw error;
  }
}
}