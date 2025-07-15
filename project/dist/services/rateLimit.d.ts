export declare class RateLimitService {
    private readonly maxRequestsPerMinute;
    private readonly windowSizeMs;
    checkRateLimit(userId: number): Promise<{
        allowed: boolean;
        remainingRequests: number;
        resetTime?: Date;
    }>;
    resetUserRateLimit(userId: number): void;
    getRateLimitStatus(userId: number): {
        requestCount: number;
        maxRequests: number;
        windowStart: Date | null;
    };
}
export declare const rateLimitService: RateLimitService;
