/**
 * MVP placeholder:
 * - Wallets can support signing messages through their own APIs.
 * - This skeleton uses "dev login" (address + nonce) and leaves signature verification as Phase 2.
 *
 * When you wire Xumm:
 * - Create a sign-in payload
 * - Get signed response and send proof to backend
 */
export async function signMessage(_message: string): Promise<string | null> {
  // TODO: Integrate Xumm or GemWallet signing.
  return null;
}
