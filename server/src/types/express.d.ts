declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number | string;
        email: string;
        name?: string | null;
        role: string;
      };
      validated?: any;
      requestId?: string;
    }
  }
}

export {};
