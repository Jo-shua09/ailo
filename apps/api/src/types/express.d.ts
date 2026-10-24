declare global {
  namespace Express {
    interface Request {
      /** Raw request bytes, kept for signature checks (agent body hash, Kora webhooks). */
      rawBody?: Buffer;
      /** Set by agentSignature once a request is verified. */
      agent?: { id: string; name: string };
      /** Set by ownerAuth. */
      owner?: true;
    }
  }
}

export {};
