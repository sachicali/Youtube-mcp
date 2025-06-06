var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// .wrangler/tmp/bundle-9NTBqh/checked-fetch.js
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
var urls;
var init_checked_fetch = __esm({
  ".wrangler/tmp/bundle-9NTBqh/checked-fetch.js"() {
    "use strict";
    urls = /* @__PURE__ */ new Set();
    __name(checkURL, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});

// .wrangler/tmp/bundle-9NTBqh/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
var init_strip_cf_connecting_ip_header = __esm({
  ".wrangler/tmp/bundle-9NTBqh/strip-cf-connecting-ip-header.js"() {
    "use strict";
    __name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        return Reflect.apply(target, thisArg, [
          stripCfConnectingIPHeader.apply(null, argArray)
        ]);
      }
    });
  }
});

// src/types/environment.types.ts
var DEFAULT_CONFIG, EnvironmentValidator, ConfigurationFactory;
var init_environment_types = __esm({
  "src/types/environment.types.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    DEFAULT_CONFIG = {
      RATE_LIMIT_REQUESTS: 100,
      RATE_LIMIT_WINDOW: 6e4,
      WS_MAX_CONNECTIONS: 1e3,
      WS_HEARTBEAT_INTERVAL: 3e4,
      WS_CONNECTION_TIMEOUT: 3e5,
      AUTH_API_KEY_MIN_LENGTH: 32,
      AUTH_SESSION_TIMEOUT: 864e5,
      AUTH_DEFAULT_QUOTA: 1e4,
      AUTH_QUOTA_WARNING_THRESHOLD: 80,
      PERFORMANCE_TARGET_CACHED: 50,
      PERFORMANCE_TARGET_KV: 200,
      PERFORMANCE_TARGET_API: 500,
      CACHE_DEFAULT_TTL: 3600,
      CACHE_VIDEO_TTL: 86400,
      CACHE_CHANNEL_TTL: 21600,
      BATCH_MAX_VIDEOS: 50,
      BATCH_MAX_CHANNELS: 20,
      RETRY_MAX_ATTEMPTS: 3,
      RETRY_INITIAL_DELAY: 1e3,
      RETRY_MAX_DELAY: 1e4,
      HEALTH_CHECK_INTERVAL: 3e5,
      METRICS_RETENTION: 864e5,
      ERROR_RATE_THRESHOLD: 5,
      DEV_PORT: 8787,
      YOUTUBE_BASE_URL: "https://www.googleapis.com/youtube/v3",
      CACHE_TTL_TRANSCRIPTS: 86400,
      CACHE_TTL_VIDEO_METRICS: 3600,
      CACHE_TTL_CHANNEL_METRICS: 7200,
      CACHE_TTL_COMMENTS: 1800,
      CACHE_TTL_SEARCH: 900,
      CACHE_TTL_TRENDING: 600
    };
    EnvironmentValidator = class {
      static {
        __name(this, "EnvironmentValidator");
      }
      static validate(env) {
        const errors = [];
        if (!env.YOUTUBE_API_KEY) {
          errors.push({ field: "YOUTUBE_API_KEY", message: "is required" });
        }
        if (!env.ENVIRONMENT) {
          errors.push({ field: "ENVIRONMENT", message: "is required" });
        }
        if (!env.YOUTUBE_MCP_KV) {
          errors.push({ field: "YOUTUBE_MCP_KV", message: "namespace is required" });
        }
        if (env.ENVIRONMENT === "production") {
          if (env.DEBUG === "true") {
            errors.push({ field: "DEBUG", message: "should not be enabled in production" });
          }
        }
        return {
          valid: errors.length === 0,
          errors
        };
      }
      static getNumeric(value, defaultValue) {
        if (!value) return defaultValue;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      static getBoolean(value, defaultValue) {
        if (value === void 0) return defaultValue;
        if (typeof value === "boolean") return value;
        return value.toLowerCase() === "true";
      }
    };
    ConfigurationFactory = class {
      static {
        __name(this, "ConfigurationFactory");
      }
      static createServerConfiguration(env) {
        const isDebugMode = EnvironmentValidator.getBoolean(env.DEBUG_MODE, false) || EnvironmentValidator.getBoolean(env.DEBUG, false) || env.ENVIRONMENT === "development";
        const rateLimitConfig = {
          requests: EnvironmentValidator.getNumeric(env.RATE_LIMIT_REQUESTS, DEFAULT_CONFIG.RATE_LIMIT_REQUESTS),
          window: EnvironmentValidator.getNumeric(env.RATE_LIMIT_WINDOW, DEFAULT_CONFIG.RATE_LIMIT_WINDOW),
          requestsPerMinute: EnvironmentValidator.getNumeric(env.RATE_LIMIT_REQUESTS, DEFAULT_CONFIG.RATE_LIMIT_REQUESTS)
        };
        const cacheConfig = {
          enabled: true,
          defaultTtl: EnvironmentValidator.getNumeric(env.CACHE_DEFAULT_TTL, DEFAULT_CONFIG.CACHE_DEFAULT_TTL),
          videoTtl: EnvironmentValidator.getNumeric(env.CACHE_VIDEO_TTL, DEFAULT_CONFIG.CACHE_VIDEO_TTL),
          channelTtl: EnvironmentValidator.getNumeric(env.CACHE_CHANNEL_TTL, DEFAULT_CONFIG.CACHE_CHANNEL_TTL),
          ttl: {
            transcripts: DEFAULT_CONFIG.CACHE_TTL_TRANSCRIPTS,
            videoMetrics: DEFAULT_CONFIG.CACHE_TTL_VIDEO_METRICS,
            channelMetrics: DEFAULT_CONFIG.CACHE_TTL_CHANNEL_METRICS,
            comments: DEFAULT_CONFIG.CACHE_TTL_COMMENTS,
            search: DEFAULT_CONFIG.CACHE_TTL_SEARCH,
            trending: DEFAULT_CONFIG.CACHE_TTL_TRENDING
          }
        };
        return {
          environment: env.ENVIRONMENT === "staging" ? "development" : env.ENVIRONMENT,
          debug: isDebugMode,
          apis: {
            youtube: {
              apiKey: env.YOUTUBE_API_KEY,
              quotaLimit: EnvironmentValidator.getNumeric(env.AUTH_DEFAULT_QUOTA, DEFAULT_CONFIG.AUTH_DEFAULT_QUOTA),
              baseUrl: DEFAULT_CONFIG.YOUTUBE_BASE_URL,
              requestsPerSecond: 10
            },
            ...env.OAUTH_CLIENT_ID && env.OAUTH_CLIENT_SECRET ? {
              oauth: {
                clientId: env.OAUTH_CLIENT_ID,
                clientSecret: env.OAUTH_CLIENT_SECRET
              }
            } : {}
          },
          externalServices: {
            ...env.YTDLP_SERVICE_URL ? {
              transcript: {
                serviceUrl: env.YTDLP_SERVICE_URL,
                timeout: 3e4
              }
            } : {}
          },
          cache: cacheConfig,
          rateLimit: rateLimitConfig,
          rateLimits: rateLimitConfig,
          // Alias
          performance: {
            targetCached: EnvironmentValidator.getNumeric(env.PERFORMANCE_TARGET_CACHED, DEFAULT_CONFIG.PERFORMANCE_TARGET_CACHED),
            targetKv: EnvironmentValidator.getNumeric(env.PERFORMANCE_TARGET_KV, DEFAULT_CONFIG.PERFORMANCE_TARGET_KV),
            targetApi: EnvironmentValidator.getNumeric(env.PERFORMANCE_TARGET_API, DEFAULT_CONFIG.PERFORMANCE_TARGET_API)
          },
          websocket: {
            maxConnections: EnvironmentValidator.getNumeric(env.WS_MAX_CONNECTIONS, DEFAULT_CONFIG.WS_MAX_CONNECTIONS),
            heartbeatInterval: EnvironmentValidator.getNumeric(env.WS_HEARTBEAT_INTERVAL, DEFAULT_CONFIG.WS_HEARTBEAT_INTERVAL),
            connectionTimeout: EnvironmentValidator.getNumeric(env.WS_CONNECTION_TIMEOUT, DEFAULT_CONFIG.WS_CONNECTION_TIMEOUT)
          },
          authentication: {
            apiKeyMinLength: EnvironmentValidator.getNumeric(env.AUTH_API_KEY_MIN_LENGTH, DEFAULT_CONFIG.AUTH_API_KEY_MIN_LENGTH),
            sessionTimeout: EnvironmentValidator.getNumeric(env.AUTH_SESSION_TIMEOUT, DEFAULT_CONFIG.AUTH_SESSION_TIMEOUT),
            defaultQuota: EnvironmentValidator.getNumeric(env.AUTH_DEFAULT_QUOTA, DEFAULT_CONFIG.AUTH_DEFAULT_QUOTA),
            quotaWarningThreshold: EnvironmentValidator.getNumeric(env.AUTH_QUOTA_WARNING_THRESHOLD, DEFAULT_CONFIG.AUTH_QUOTA_WARNING_THRESHOLD)
          },
          cors: {
            enabled: EnvironmentValidator.getBoolean(env.DEV_CORS_ENABLED, env.ENVIRONMENT === "development"),
            origins: env.DEV_CORS_ORIGINS ? env.DEV_CORS_ORIGINS.split(",") : ["*"],
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            headers: ["Content-Type", "Authorization", "X-Requested-With"]
          },
          monitoring: {
            enabled: true,
            logLevel: isDebugMode ? "debug" : "info",
            metricsRetention: EnvironmentValidator.getNumeric(env.METRICS_RETENTION, DEFAULT_CONFIG.METRICS_RETENTION),
            errorTracking: EnvironmentValidator.getBoolean(env.ERROR_TRACKING_ENABLED, true),
            performanceTracking: true
          }
        };
      }
    };
  }
});

// src/services/configuration.service.ts
var configuration_service_exports = {};
__export(configuration_service_exports, {
  ConfigurationService: () => ConfigurationService
});
var ConfigurationService;
var init_configuration_service = __esm({
  "src/services/configuration.service.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_environment_types();
    ConfigurationService = class {
      static {
        __name(this, "ConfigurationService");
      }
      env;
      config;
      initialized = false;
      constructor(env) {
        this.env = env;
        this.config = ConfigurationFactory.createServerConfiguration(env);
      }
      /**
       * Initialize the configuration service (async initialization if needed)
       */
      async initialize() {
        if (this.initialized) return;
        const validation = this.validateEnvironment(this.env);
        if (!validation.valid) {
          const errorMessages = validation.errors.map((e) => `${e.field}: ${e.message}`).join(", ");
          throw new Error(`Invalid environment configuration: ${errorMessages}`);
        }
        this.initialized = true;
      }
      /**
       * Get the complete server configuration
       */
      getConfig() {
        return this.config;
      }
      /**
       * Get the complete server configuration (alias for compatibility)
       */
      getConfiguration() {
        return this.config;
      }
      /**
       * Get environment type
       */
      getEnvironment() {
        const env = this.env.ENVIRONMENT;
        return env === "staging" ? "development" : env;
      }
      /**
       * Check if debug mode is enabled
       */
      isDebugMode() {
        return this.config.debug;
      }
      /**
       * Get YouTube API configuration
       */
      getYouTubeConfig() {
        return this.config.apis.youtube;
      }
      /**
       * Get cache configuration
       */
      getCacheConfig() {
        return this.config.cache;
      }
      /**
       * Get rate limiting configuration
       */
      getRateLimitConfig() {
        return this.config.rateLimits;
      }
      /**
       * Get WebSocket configuration
       */
      getWebSocketConfig() {
        return this.config.websocket;
      }
      /**
       * Get authentication configuration
       */
      getAuthConfig() {
        return this.config.authentication;
      }
      /**
       * Get CORS configuration
       */
      getCorsConfig() {
        return this.config.cors;
      }
      /**
       * Get monitoring configuration
       */
      getMonitoringConfig() {
        return this.config.monitoring;
      }
      /**
       * Get external services configuration
       */
      getExternalServicesConfig() {
        return this.config.externalServices;
      }
      /**
       * Get performance configuration
       */
      getPerformanceConfig() {
        return this.config.performance;
      }
      /**
       * Check if service is initialized
       */
      isInitialized() {
        return this.initialized;
      }
      /**
       * Validate environment configuration
       */
      validateEnvironment(env) {
        const basicValidation = EnvironmentValidator.validate(env);
        const warnings = [];
        const errors = [...basicValidation.errors];
        if (env.ENVIRONMENT === "production") {
          if (env.DEBUG === "true") {
            warnings.push({
              code: "PROD_DEBUG_ENABLED",
              message: "Debug mode should not be enabled in production",
              field: "DEBUG",
              recommendation: "Set DEBUG=false or remove DEBUG environment variable"
            });
          }
          if (!env.OAUTH_CLIENT_ID || !env.OAUTH_CLIENT_SECRET) {
            warnings.push({
              code: "MISSING_OAUTH",
              message: "OAuth credentials not configured for production",
              field: "OAUTH_CLIENT_ID",
              recommendation: "Configure OAuth credentials for enhanced functionality"
            });
          }
        }
        const rateLimitRequests = EnvironmentValidator.getNumeric(env.RATE_LIMIT_REQUESTS, 100);
        if (rateLimitRequests > 1e3) {
          warnings.push({
            code: "HIGH_RATE_LIMIT",
            message: "Rate limit is set very high",
            field: "RATE_LIMIT_REQUESTS",
            recommendation: "Consider lowering rate limit for better resource management"
          });
        }
        if (env.DEV_CORS_ENABLED === "true" && env.ENVIRONMENT === "production") {
          warnings.push({
            code: "CORS_ENABLED_PROD",
            message: "CORS is enabled in production",
            field: "DEV_CORS_ENABLED",
            recommendation: "Review CORS configuration for production security"
          });
        }
        return {
          valid: errors.length === 0,
          errors,
          warnings
        };
      }
      /**
       * Get configuration warnings
       */
      getConfigurationWarnings() {
        const validation = this.validateEnvironment(this.env);
        return validation.warnings;
      }
      /**
       * Get raw environment variables
       */
      getRawEnvironment() {
        return this.env;
      }
      /**
       * Update environment configuration (for testing purposes)
       */
      updateEnvironment(env) {
        this.env = env;
        this.config = ConfigurationFactory.createServerConfiguration(env);
        this.initialized = false;
      }
      /**
       * Validate current configuration
       */
      validateConfiguration() {
        return this.validateEnvironment(this.env);
      }
    };
  }
});

// src/services/youtube.service.ts
var youtube_service_exports = {};
__export(youtube_service_exports, {
  TranscriptNotAvailableError: () => TranscriptNotAvailableError,
  YouTubeAPIRequestError: () => YouTubeAPIRequestError,
  YouTubeService: () => YouTubeService
});
var YouTubeService, YouTubeAPIRequestError, TranscriptNotAvailableError;
var init_youtube_service = __esm({
  "src/services/youtube.service.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    YouTubeService = class _YouTubeService {
      static {
        __name(this, "YouTubeService");
      }
      config;
      logger;
      env;
      apiKey;
      baseUrl;
      constructor(config, logger2, env) {
        this.config = config;
        this.logger = logger2;
        this.env = env;
        const youtubeConfig = this.config.getYouTubeConfig();
        this.apiKey = youtubeConfig.apiKey;
        this.baseUrl = youtubeConfig.baseUrl;
      }
      /**
       * Extract transcript from YouTube video URL or video ID
       * Uses YouTube Data API with alternative approaches for transcript extraction
       */
      async getVideoTranscript(videoUrl, language = "en") {
        this.logger.info("Getting video transcript", { videoUrl, language });
        try {
          const videoId = _YouTubeService.extractVideoId(videoUrl);
          if (!videoId) {
            throw new Error(`Invalid YouTube URL or video ID: ${videoUrl}`);
          }
          if (!_YouTubeService.isValidVideoId(videoId)) {
            throw new Error(`Invalid video ID format: ${videoId}`);
          }
          const cacheKey = `transcript:${videoId}:${language}`;
          const cached = await this.getCachedData(cacheKey);
          if (cached) {
            this.logger.info("Transcript cache hit", { videoId, language });
            return cached;
          }
          const videoInfo = await this.getVideoInfo(videoId);
          if (!videoInfo.contentDetails.caption) {
            throw new TranscriptNotAvailableError(
              videoId,
              "not_available",
              "No captions available for this video",
              []
            );
          }
          let captionsResponse;
          try {
            captionsResponse = await this.makeYouTubeAPIRequest(
              "captions",
              { part: "snippet", videoId }
            );
          } catch (error) {
            this.logger.warn("Captions API requires authentication, providing structured fallback", {
              videoId,
              error: error instanceof Error ? error.message : String(error)
            });
            return this.createFallbackTranscriptResponse(videoId, videoInfo, language);
          }
          if (!captionsResponse.items || captionsResponse.items.length === 0) {
            return this.createFallbackTranscriptResponse(videoId, videoInfo, language);
          }
          const captionTrack = this.findBestCaptionTrack(captionsResponse.items, language);
          if (!captionTrack) {
            const availableLanguages = captionsResponse.items.map((item) => item.snippet.language);
            throw new TranscriptNotAvailableError(
              videoId,
              "language_not_supported",
              `Language '${language}' not available`,
              availableLanguages
            );
          }
          const transcript = {
            videoId,
            language: captionTrack.snippet.language,
            isAutoGenerated: captionTrack.snippet.trackKind === "asr",
            segments: this.createPlaceholderSegments(videoInfo),
            fullText: this.createTranscriptPlaceholder(videoInfo, captionTrack),
            wordCount: 0,
            // Will be updated when actual transcript is available
            estimatedReadingTime: 0
          };
          await this.setCachedData(cacheKey, transcript, this.config.getCacheConfig().ttl.transcripts);
          this.logger.info("Transcript metadata extracted successfully", {
            videoId,
            language,
            isAutoGenerated: transcript.isAutoGenerated,
            captionTrackId: captionTrack.id
          });
          return transcript;
        } catch (error) {
          this.logger.error("Failed to get video transcript", {
            videoUrl,
            language,
            error: error instanceof Error ? error.message : String(error)
          });
          if (error instanceof TranscriptNotAvailableError) {
            throw error;
          }
          throw new Error(`Failed to extract transcript: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      /**
       * Get video metrics and analytics
       */
      async getVideoMetrics(videoId) {
        this.logger.info("Getting video metrics", { videoId });
        try {
          const cacheKey = `metrics:${videoId}`;
          const cached = await this.getCachedData(cacheKey);
          if (cached) {
            this.logger.info("Metrics cache hit", { videoId });
            return cached;
          }
          const response = await this.makeYouTubeAPIRequest("videos", {
            part: "statistics,contentDetails,snippet",
            id: videoId
          });
          if (!response.items || response.items.length === 0) {
            throw new Error(`Video not found: ${videoId}`);
          }
          const video = response.items[0];
          const stats = video.statistics;
          const contentDetails = video.contentDetails;
          if (!stats) {
            throw new Error("Video statistics not available");
          }
          const viewCount = parseInt(stats.viewCount || "0");
          const likeCount = parseInt(stats.likeCount || "0");
          const commentCount = parseInt(stats.commentCount || "0");
          const favoriteCount = parseInt(stats.favoriteCount || "0");
          const likeRatio = viewCount > 0 ? likeCount / viewCount * 100 : 0;
          const commentRatio = viewCount > 0 ? commentCount / viewCount * 100 : 0;
          const engagementScore = (likeCount + commentCount) / Math.max(viewCount, 1) * 100;
          const metrics = {
            viewCount,
            likeCount,
            commentCount,
            favoriteCount,
            dislikeCount: stats.dislikeCount ? parseInt(stats.dislikeCount) : void 0,
            publishedAt: video.snippet.publishedAt,
            duration: contentDetails?.duration || "PT0S",
            engagement: {
              likeRatio: Math.round(likeRatio * 100) / 100,
              commentRatio: Math.round(commentRatio * 100) / 100,
              engagementScore: Math.round(engagementScore * 100) / 100
            }
          };
          await this.setCachedData(cacheKey, metrics, this.config.getCacheConfig().ttl.videoMetrics);
          this.logger.info("Video metrics retrieved successfully", {
            videoId,
            viewCount,
            likeCount,
            commentCount,
            engagementScore: metrics.engagement.engagementScore
          });
          return metrics;
        } catch (error) {
          this.logger.error("Failed to get video metrics", {
            videoId,
            error: error instanceof Error ? error.message : String(error)
          });
          throw new Error(`Failed to get video metrics: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      /**
       * Get comprehensive video information
       */
      async getVideoInfo(videoId) {
        this.logger.info("Getting video info", { videoId });
        try {
          const response = await this.makeYouTubeAPIRequest("videos", {
            part: "snippet,statistics,contentDetails,status",
            id: videoId
          });
          if (!response.items || response.items.length === 0) {
            throw new Error(`Video not found: ${videoId}`);
          }
          const video = response.items[0];
          const metrics = await this.getVideoMetrics(videoId);
          const videoInfo = {
            videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            channelId: video.snippet.channelId,
            channelTitle: video.snippet.channelTitle,
            metrics,
            tags: video.snippet.tags || [],
            categoryId: video.snippet.categoryId,
            thumbnails: {
              default: video.snippet.thumbnails.default?.url,
              medium: video.snippet.thumbnails.medium?.url,
              high: video.snippet.thumbnails.high?.url
            },
            contentDetails: {
              duration: video.contentDetails?.duration || "PT0S",
              definition: video.contentDetails?.definition || "sd",
              caption: video.contentDetails?.caption === "true",
              licensedContent: video.contentDetails?.licensedContent || false
            },
            status: {
              privacyStatus: video.status?.privacyStatus || "public",
              embeddable: video.status?.embeddable || true,
              publicStatsViewable: video.status?.publicStatsViewable || true
            }
          };
          this.logger.info("Video info retrieved successfully", {
            videoId,
            title: videoInfo.title,
            channelTitle: videoInfo.channelTitle,
            duration: videoInfo.contentDetails.duration
          });
          return videoInfo;
        } catch (error) {
          this.logger.error("Failed to get video info", {
            videoId,
            error: error instanceof Error ? error.message : String(error)
          });
          throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      /**
       * Public method to make YouTube API requests (for tool usage)
       */
      async makeAPIRequest(endpoint, params) {
        return this.makeYouTubeAPIRequest(endpoint, params);
      }
      /**
       * Make YouTube API request with error handling and rate limiting
       */
      async makeYouTubeAPIRequest(endpoint, params) {
        const url = new URL(`${this.baseUrl}/${endpoint}`);
        url.searchParams.set("key", this.apiKey);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
        this.logger.debug("Making YouTube API request", {
          endpoint,
          params,
          url: url.toString()
        });
        try {
          const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
              "User-Agent": "YouTube-MCP-Server/1.0",
              "Accept": "application/json"
            }
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new YouTubeAPIRequestError(
              errorData.error.code,
              errorData.error.message,
              errorData.error.status
            );
          }
          const data = await response.json();
          this.logger.debug("YouTube API request successful", {
            endpoint,
            status: response.status,
            resultCount: data.items?.length || 0
          });
          return data;
        } catch (error) {
          if (error instanceof YouTubeAPIRequestError) {
            throw error;
          }
          this.logger.error("YouTube API request failed", {
            endpoint,
            error: error instanceof Error ? error.message : String(error)
          });
          throw new Error(`YouTube API request failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      /**
       * Find the best caption track for the requested language
       */
      findBestCaptionTrack(captionTracks, language) {
        let track = captionTracks.find((track2) => track2.snippet.language === language);
        if (track) return track;
        const baseLanguage = language.split("-")[0];
        track = captionTracks.find((track2) => track2.snippet.language.startsWith(baseLanguage));
        if (track) return track;
        track = captionTracks.find((track2) => track2.snippet.language.startsWith("en"));
        if (track) return track;
        return captionTracks[0] || null;
      }
      /**
       * Create a fallback transcript response when direct API access is limited
       */
      createFallbackTranscriptResponse(videoId, videoInfo, language) {
        return {
          videoId,
          language,
          isAutoGenerated: true,
          // Most YouTube videos have auto-generated captions
          segments: this.createPlaceholderSegments(videoInfo),
          fullText: this.createTranscriptPlaceholder(videoInfo),
          wordCount: 0,
          estimatedReadingTime: 0
        };
      }
      /**
       * Create placeholder segments based on video duration
       */
      createPlaceholderSegments(videoInfo) {
        const durationSeconds = this.parseDuration(videoInfo.contentDetails.duration);
        const segments = [];
        const segmentDuration = 30;
        const numSegments = Math.ceil(durationSeconds / segmentDuration);
        for (let i = 0; i < Math.min(numSegments, 10); i++) {
          const start = i * segmentDuration;
          const end = Math.min(start + segmentDuration, durationSeconds);
          segments.push({
            text: `[Transcript segment ${i + 1} - ${this.formatTime(start)} to ${this.formatTime(end)}]`,
            start,
            duration: end - start,
            end
          });
        }
        return segments;
      }
      /**
       * Create transcript placeholder text with available information
       */
      createTranscriptPlaceholder(videoInfo, captionTrack) {
        const lines = [
          `Video: ${videoInfo.title}`,
          `Channel: ${videoInfo.channelTitle}`,
          `Duration: ${this.formatDuration(videoInfo.contentDetails.duration)}`,
          ``,
          `Transcript Status: Captions are available for this video.`,
          ``
        ];
        if (captionTrack) {
          lines.push(
            `Caption Language: ${captionTrack.snippet.language}`,
            `Caption Type: ${captionTrack.snippet.trackKind === "asr" ? "Auto-generated" : "Manual"}`,
            ``
          );
        }
        lines.push(
          `Note: Full transcript extraction requires additional authentication for the YouTube Captions API.`,
          `This response provides video metadata and confirms transcript availability.`,
          ``,
          `To access the full transcript, consider:`,
          `1. Using YouTube's auto-generated transcript feature directly on the video page`,
          `2. Implementing OAuth 2.0 authentication for the YouTube Captions API`,
          `3. Using an external transcript extraction service`
        );
        return lines.join("\n");
      }
      /**
       * Parse ISO 8601 duration to seconds
       */
      parseDuration(duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        const hours = parseInt(match[1] || "0");
        const minutes = parseInt(match[2] || "0");
        const seconds = parseInt(match[3] || "0");
        return hours * 3600 + minutes * 60 + seconds;
      }
      /**
       * Format seconds to MM:SS or HH:MM:SS
       */
      formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor(seconds % 3600 / 60);
        const secs = seconds % 60;
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${minutes}:${secs.toString().padStart(2, "0")}`;
      }
      /**
       * Format ISO 8601 duration to human readable
       */
      formatDuration(duration) {
        const seconds = this.parseDuration(duration);
        return this.formatTime(seconds);
      }
      /**
       * Parse transcript content from various formats
       */
      parseTranscriptContent(content) {
        const segments = [];
        const lines = content.split("\n").filter((line) => line.trim());
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line && !line.includes("-->") && !line.match(/^\d+$/)) {
            segments.push({
              text: line,
              start: i * 3,
              // Placeholder timing
              duration: 3,
              end: (i + 1) * 3
            });
          }
        }
        return segments;
      }
      /**
       * Get data from cache
       */
      async getCachedData(key) {
        try {
          if (!this.config.getCacheConfig().enabled) {
            return null;
          }
          const cached = await this.env.CACHE_KV?.get(key);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch (error) {
          this.logger.warn("Cache read failed", {
            key,
            error: error instanceof Error ? error.message : String(error)
          });
        }
        return null;
      }
      /**
       * Set data in cache
       */
      async setCachedData(key, data, ttl) {
        try {
          if (!this.config.getCacheConfig().enabled) {
            return;
          }
          await this.env.CACHE_KV?.put(key, JSON.stringify(data), {
            expirationTtl: ttl
          });
          this.logger.debug("Data cached successfully", { key, ttl });
        } catch (error) {
          this.logger.warn("Cache write failed", {
            key,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      /**
       * Extract video ID from various YouTube URL formats
       */
      static extractVideoId(url) {
        const patterns = [
          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
          /^([a-zA-Z0-9_-]{11})$/
          // Direct video ID
        ];
        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match) {
            return match[1];
          }
        }
        return null;
      }
      /**
       * Validate video ID format
       */
      static isValidVideoId(videoId) {
        return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
      }
    };
    YouTubeAPIRequestError = class extends Error {
      static {
        __name(this, "YouTubeAPIRequestError");
      }
      code;
      status;
      constructor(code, message, status) {
        super(message);
        this.name = "YouTubeAPIRequestError";
        this.code = code;
        this.status = status;
      }
    };
    TranscriptNotAvailableError = class extends Error {
      static {
        __name(this, "TranscriptNotAvailableError");
      }
      videoId;
      error;
      availableLanguages;
      constructor(videoId, error, message, availableLanguages) {
        super(message);
        this.name = "TranscriptNotAvailableError";
        this.videoId = videoId;
        this.error = error;
        this.availableLanguages = availableLanguages;
      }
    };
  }
});

// src/utils/logger.util.ts
var logger_util_exports = {};
__export(logger_util_exports, {
  LoggerUtil: () => LoggerUtil
});
var LoggerUtil;
var init_logger_util = __esm({
  "src/utils/logger.util.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    LoggerUtil = class _LoggerUtil {
      static {
        __name(this, "LoggerUtil");
      }
      config;
      logLevels = {
        debug: { level: "debug", priority: 0 },
        info: { level: "info", priority: 1 },
        warn: { level: "warn", priority: 2 },
        error: { level: "error", priority: 3 }
      };
      constructor(config) {
        this.config = config;
      }
      /**
       * Log debug message
       */
      debug(message, context) {
        this.log("debug", message, context);
      }
      /**
       * Log info message
       */
      info(message, context) {
        this.log("info", message, context);
      }
      /**
       * Log warning message
       */
      warn(message, context) {
        this.log("warn", message, context);
      }
      /**
       * Log error message
       */
      error(message, context) {
        this.log("error", message, context);
      }
      /**
       * Core logging method
       */
      log(level, message, context) {
        const currentLevel = this.logLevels[this.config.monitoring.logLevel];
        const targetLevel = this.logLevels[level];
        if (targetLevel.priority < currentLevel.priority) {
          return;
        }
        const logEntry = {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          level,
          message,
          environment: this.config.environment,
          ...context
        };
        switch (level) {
          case "debug":
            console.debug(JSON.stringify(logEntry));
            break;
          case "info":
            console.info(JSON.stringify(logEntry));
            break;
          case "warn":
            console.warn(JSON.stringify(logEntry));
            break;
          case "error":
            console.error(JSON.stringify(logEntry));
            break;
        }
      }
      /**
       * Log performance metrics
       */
      logPerformance(operation, startTime, context) {
        const duration = Date.now() - startTime;
        this.info(`Performance: ${operation}`, {
          operation,
          duration,
          performanceCategory: duration < 100 ? "fast" : duration < 500 ? "medium" : "slow",
          ...context
        });
      }
      /**
       * Log request metrics
       */
      logRequest(method, url, statusCode, duration, context) {
        const level = statusCode >= 400 ? "warn" : "info";
        this.log(level, `${method} ${url} ${statusCode}`, {
          method,
          url,
          statusCode,
          duration,
          requestCategory: statusCode >= 500 ? "server_error" : statusCode >= 400 ? "client_error" : "success",
          ...context
        });
      }
      /**
       * Log quota usage
       */
      logQuotaUsage(operation, quotaUsed, quotaRemaining, context) {
        const usagePercent = quotaUsed / (quotaUsed + quotaRemaining) * 100;
        const level = usagePercent > 90 ? "warn" : usagePercent > 75 ? "info" : "debug";
        this.log(level, `Quota usage: ${operation}`, {
          operation,
          quotaUsed,
          quotaRemaining,
          usagePercent: Math.round(usagePercent),
          quotaCategory: usagePercent > 90 ? "critical" : usagePercent > 75 ? "high" : "normal",
          ...context
        });
      }
      /**
       * Log cache metrics
       */
      logCacheMetrics(operation, hit, key, ttl, context) {
        this.debug(`Cache ${hit ? "hit" : "miss"}: ${operation}`, {
          operation,
          cacheHit: hit,
          cacheKey: key,
          ttl,
          ...context
        });
      }
      /**
       * Create child logger with persistent context
       */
      child(persistentContext) {
        const childLogger = new _LoggerUtil(this.config);
        const originalLog = childLogger.log.bind(childLogger);
        childLogger.log = (level, message, context) => {
          originalLog(level, message, { ...persistentContext, ...context });
        };
        return childLogger;
      }
      /**
       * Get current log level
       */
      getLogLevel() {
        return this.config.monitoring.logLevel;
      }
      /**
       * Check if level should be logged
       */
      shouldLog(level) {
        const currentLevel = this.logLevels[this.config.monitoring.logLevel];
        const targetLevel = this.logLevels[level];
        return targetLevel.priority >= currentLevel.priority;
      }
    };
  }
});

// .wrangler/tmp/bundle-9NTBqh/middleware-loader.entry.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();

// .wrangler/tmp/bundle-9NTBqh/middleware-insertion-facade.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();

// src/index.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();

// src/remote-mcp-server.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_configuration_service();
init_youtube_service();

// src/services/authentication.service.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
var AuthenticationService = class {
  // 5 minutes
  constructor(env, logger2, errorHandler2) {
    this.env = env;
    this.logger = logger2;
    this.errorHandler = errorHandler2;
  }
  static {
    __name(this, "AuthenticationService");
  }
  sessionCache = /* @__PURE__ */ new Map();
  apiKeyCache = /* @__PURE__ */ new Map();
  cacheTimeout = 3e5;
  /**
   * Validate API key and return user session
   */
  async validateApiKey(apiKey) {
    try {
      const cachedSession = this.apiKeyCache.get(apiKey);
      if (cachedSession && this.isSessionValid(cachedSession)) {
        return cachedSession;
      }
      if (!this.isValidApiKeyFormat(apiKey)) {
        this.logger.warn("Invalid API key format", { apiKey: apiKey.substring(0, 8) + "..." });
        return null;
      }
      const sessionData = await this.env.YOUTUBE_MCP_KV.get(`apikey:${apiKey}`, "json");
      if (!sessionData) {
        this.logger.warn("API key not found", { apiKey: apiKey.substring(0, 8) + "..." });
        return null;
      }
      const session = {
        ...sessionData,
        lastActivity: (/* @__PURE__ */ new Date()).toISOString()
      };
      await this.updateUserSession(session);
      this.sessionCache.set(session.id, session);
      this.apiKeyCache.set(apiKey, session);
      this.logger.info("API key validated successfully", {
        userId: session.id,
        quotaUsed: session.quotaUsed,
        quotaLimit: session.quotaLimit
      });
      return session;
    } catch (error) {
      this.logger.error("API key validation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        apiKey: apiKey.substring(0, 8) + "..."
      });
      return null;
    }
  }
  /**
   * Create a new user session with API key
   */
  async createUserSession(apiKey, permissions = this.getDefaultPermissions()) {
    try {
      const userId = crypto.randomUUID();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const session = {
        id: userId,
        apiKey,
        quotaUsed: 0,
        quotaLimit: 1e4 * permissions.quotaMultiplier,
        // Base 10k per day
        createdAt: now,
        lastActivity: now,
        permissions
      };
      await Promise.all([
        this.env.YOUTUBE_MCP_KV.put(`session:${userId}`, JSON.stringify(session)),
        this.env.YOUTUBE_MCP_KV.put(`apikey:${apiKey}`, JSON.stringify(session)),
        this.env.YOUTUBE_MCP_KV.put(`quota:${userId}`, JSON.stringify({
          used: 0,
          limit: session.quotaLimit,
          resetAt: this.getNextQuotaReset(),
          lastUpdated: now
        }))
      ]);
      this.sessionCache.set(userId, session);
      this.apiKeyCache.set(apiKey, session);
      this.logger.info("User session created", {
        userId,
        quotaLimit: session.quotaLimit,
        permissions
      });
      return session;
    } catch (error) {
      this.logger.error("Failed to create user session", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  /**
   * Get user quota usage information
   */
  async getUserQuotaUsage(userId) {
    try {
      const session = this.sessionCache.get(userId);
      if (session) {
        return {
          used: session.quotaUsed,
          limit: session.quotaLimit,
          resetAt: this.getNextQuotaReset(),
          warningThreshold: 80
        };
      }
      const quotaData = await this.env.YOUTUBE_MCP_KV.get(`quota:${userId}`, "json");
      if (!quotaData) {
        return {
          used: 0,
          limit: 1e4,
          resetAt: this.getNextQuotaReset(),
          warningThreshold: 80
        };
      }
      return quotaData;
    } catch (error) {
      this.logger.error("Failed to get user quota", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return {
        used: 0,
        limit: 1e4,
        resetAt: this.getNextQuotaReset(),
        warningThreshold: 80
      };
    }
  }
  /**
   * Update user quota usage
   */
  async updateQuotaUsage(userId, quotaUsed) {
    try {
      const currentQuota = await this.getUserQuotaUsage(userId);
      const newUsage = currentQuota.used + quotaUsed;
      const updatedQuota = {
        ...currentQuota,
        used: newUsage,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
      await this.env.YOUTUBE_MCP_KV.put(`quota:${userId}`, JSON.stringify(updatedQuota));
      const session = this.sessionCache.get(userId);
      if (session) {
        session.quotaUsed = newUsage;
        session.lastActivity = (/* @__PURE__ */ new Date()).toISOString();
      }
      const usagePercentage = newUsage / updatedQuota.limit * 100;
      if (usagePercentage >= updatedQuota.warningThreshold) {
        this.logger.warn("Quota usage warning", {
          userId,
          used: newUsage,
          limit: updatedQuota.limit,
          percentage: Math.round(usagePercentage)
        });
      }
      return updatedQuota;
    } catch (error) {
      this.logger.error("Failed to update quota usage", {
        userId,
        quotaUsed,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  /**
   * Check if user has quota available
   */
  async hasQuotaAvailable(userId, requiredQuota = 1) {
    try {
      const quotaInfo = await this.getUserQuotaUsage(userId);
      return quotaInfo.used + requiredQuota <= quotaInfo.limit;
    } catch (error) {
      this.logger.error("Failed to check quota availability", {
        userId,
        requiredQuota,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return false;
    }
  }
  /**
   * Reset user quota (daily reset)
   */
  async resetUserQuota(userId) {
    try {
      const session = await this.getUserSession(userId);
      if (!session) {
        throw new Error("User session not found");
      }
      const resetQuota = {
        used: 0,
        limit: session.quotaLimit,
        resetAt: this.getNextQuotaReset(),
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        warningThreshold: 80
      };
      await this.env.YOUTUBE_MCP_KV.put(`quota:${userId}`, JSON.stringify(resetQuota));
      if (this.sessionCache.has(userId)) {
        const cachedSession = this.sessionCache.get(userId);
        cachedSession.quotaUsed = 0;
        cachedSession.lastActivity = (/* @__PURE__ */ new Date()).toISOString();
      }
      this.logger.info("User quota reset", {
        userId,
        newLimit: resetQuota.limit,
        nextReset: resetQuota.resetAt
      });
    } catch (error) {
      this.logger.error("Failed to reset user quota", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  /**
   * Get user session by ID
   */
  async getUserSession(userId) {
    try {
      const cachedSession = this.sessionCache.get(userId);
      if (cachedSession && this.isSessionValid(cachedSession)) {
        return cachedSession;
      }
      const sessionData = await this.env.YOUTUBE_MCP_KV.get(`session:${userId}`, "json");
      if (sessionData) {
        this.sessionCache.set(userId, sessionData);
        return sessionData;
      }
      return null;
    } catch (error) {
      this.logger.error("Failed to get user session", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return null;
    }
  }
  /**
   * Update user session
   */
  async updateUserSession(session) {
    try {
      session.lastActivity = (/* @__PURE__ */ new Date()).toISOString();
      await Promise.all([
        this.env.YOUTUBE_MCP_KV.put(`session:${session.id}`, JSON.stringify(session)),
        this.env.YOUTUBE_MCP_KV.put(`apikey:${session.apiKey}`, JSON.stringify(session))
      ]);
      this.sessionCache.set(session.id, session);
      this.apiKeyCache.set(session.apiKey, session);
    } catch (error) {
      this.logger.error("Failed to update user session", {
        userId: session.id,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  /**
   * Invalidate user session
   */
  async invalidateSession(userId) {
    try {
      const session = await this.getUserSession(userId);
      if (!session) {
        return;
      }
      await Promise.all([
        this.env.YOUTUBE_MCP_KV.delete(`session:${userId}`),
        this.env.YOUTUBE_MCP_KV.delete(`apikey:${session.apiKey}`),
        this.env.YOUTUBE_MCP_KV.delete(`quota:${userId}`)
      ]);
      this.sessionCache.delete(userId);
      this.apiKeyCache.delete(session.apiKey);
      this.logger.info("User session invalidated", { userId });
    } catch (error) {
      this.logger.error("Failed to invalidate session", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  /**
   * Check if API key format is valid
   */
  isValidApiKeyFormat(apiKey) {
    return /^[a-zA-Z0-9_-]{32,}$/.test(apiKey);
  }
  /**
   * Check if session is still valid
   */
  isSessionValid(session) {
    const lastActivity = new Date(session.lastActivity);
    const now = /* @__PURE__ */ new Date();
    const timeDiff = now.getTime() - lastActivity.getTime();
    return timeDiff < this.cacheTimeout;
  }
  /**
   * Get default user permissions
   */
  getDefaultPermissions() {
    return {
      canUseTools: [
        "getVideoTranscript",
        "getVideoAnalytics",
        "getChannelAnalytics",
        "getVideoComments",
        "searchVideos",
        "getTrendingVideos",
        "getCompetitorAnalysis"
      ],
      canAccessSharedCache: true,
      canReceiveNotifications: true,
      quotaMultiplier: 1
    };
  }
  /**
   * Get next quota reset time (daily at midnight UTC)
   */
  getNextQuotaReset() {
    const tomorrow = /* @__PURE__ */ new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }
  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache() {
    const now = /* @__PURE__ */ new Date();
    for (const [userId, session] of this.sessionCache.entries()) {
      if (!this.isSessionValid(session)) {
        this.sessionCache.delete(userId);
        this.apiKeyCache.delete(session.apiKey);
      }
    }
  }
  /**
   * Get authentication statistics
   */
  getAuthStats() {
    this.cleanupExpiredCache();
    const sessions = Array.from(this.sessionCache.values());
    const totalQuotaUsed = sessions.reduce((sum, session) => sum + session.quotaUsed, 0);
    const averageQuotaUsage = sessions.length > 0 ? totalQuotaUsed / sessions.length : 0;
    return {
      activeSessions: sessions.filter((s) => this.isSessionValid(s)).length,
      cachedSessions: sessions.length,
      totalQuotaUsed,
      averageQuotaUsage: Math.round(averageQuotaUsage)
    };
  }
  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup() {
    this.sessionCache.clear();
    this.apiKeyCache.clear();
    this.logger.info("Authentication service cleaned up");
  }
};

// src/services/connection-management.service.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
var ConnectionManagementService = class {
  constructor(env, logger2, errorHandler2) {
    this.env = env;
    this.logger = logger2;
    this.errorHandler = errorHandler2;
    this.startCleanupInterval();
  }
  static {
    __name(this, "ConnectionManagementService");
  }
  connections = /* @__PURE__ */ new Map();
  connectionMetrics = /* @__PURE__ */ new Map();
  cleanupInterval = null;
  /**
   * Register a new client connection
   */
  async registerConnection(sessionId, connection) {
    try {
      this.connections.set(sessionId, connection);
      this.connectionMetrics.set(sessionId, {
        sessionId,
        connectedAt: connection.connectedAt,
        lastActivity: connection.lastPing,
        messagesSent: 0,
        messagesReceived: 0,
        bytesTransferred: 0,
        errors: 0
      });
      await this.env.YOUTUBE_MCP_KV.put(
        `connection:${sessionId}`,
        JSON.stringify({
          sessionId,
          connectedAt: connection.connectedAt.toISOString(),
          metadata: connection.metadata
        }),
        { expirationTtl: 86400 }
        // 24 hours
      );
      this.logger.info("Connection registered", {
        sessionId,
        totalConnections: this.connections.size,
        metadata: connection.metadata
      });
    } catch (error) {
      this.logger.error("Failed to register connection", {
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  /**
   * Unregister a client connection
   */
  async unregisterConnection(sessionId) {
    try {
      const connection = this.connections.get(sessionId);
      if (!connection) {
        return;
      }
      const duration = Date.now() - connection.connectedAt.getTime();
      const metrics = this.connectionMetrics.get(sessionId);
      this.connections.delete(sessionId);
      this.connectionMetrics.delete(sessionId);
      await this.env.YOUTUBE_MCP_KV.delete(`connection:${sessionId}`);
      this.logger.info("Connection unregistered", {
        sessionId,
        duration,
        totalConnections: this.connections.size,
        finalMetrics: metrics
      });
    } catch (error) {
      this.logger.error("Failed to unregister connection", {
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  /**
   * Get connection by session ID
   */
  getConnection(sessionId) {
    return this.connections.get(sessionId) || null;
  }
  /**
   * Get all active connections
   */
  getAllConnections() {
    return Array.from(this.connections.values());
  }
  /**
   * Update connection activity
   */
  updateConnectionActivity(sessionId) {
    const connection = this.connections.get(sessionId);
    const metrics = this.connectionMetrics.get(sessionId);
    if (connection) {
      connection.lastPing = /* @__PURE__ */ new Date();
    }
    if (metrics) {
      metrics.lastActivity = /* @__PURE__ */ new Date();
    }
  }
  /**
   * Track message sent from connection
   */
  trackMessageSent(sessionId, messageSize = 0) {
    const metrics = this.connectionMetrics.get(sessionId);
    if (metrics) {
      metrics.messagesSent++;
      metrics.bytesTransferred += messageSize;
      metrics.lastActivity = /* @__PURE__ */ new Date();
    }
  }
  /**
   * Track message received by connection
   */
  trackMessageReceived(sessionId, messageSize = 0) {
    const metrics = this.connectionMetrics.get(sessionId);
    if (metrics) {
      metrics.messagesReceived++;
      metrics.bytesTransferred += messageSize;
      metrics.lastActivity = /* @__PURE__ */ new Date();
    }
  }
  /**
   * Track connection error
   */
  trackConnectionError(sessionId, error) {
    const metrics = this.connectionMetrics.get(sessionId);
    if (metrics) {
      metrics.errors++;
    }
    this.logger.warn("Connection error tracked", {
      sessionId,
      error: error.message,
      totalErrors: metrics?.errors || 0
    });
  }
  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const now = /* @__PURE__ */ new Date();
    const metrics = Array.from(this.connectionMetrics.values());
    const activeConnections = metrics.filter(
      (m) => now.getTime() - m.lastActivity.getTime() < 3e5
      // 5 minutes
    ).length;
    const totalMessages = metrics.reduce((sum, m) => sum + m.messagesSent + m.messagesReceived, 0);
    const totalBytes = metrics.reduce((sum, m) => sum + m.bytesTransferred, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errors, 0);
    const connectionTimes = metrics.map((m) => now.getTime() - m.connectedAt.getTime());
    const averageConnectionTime = connectionTimes.length > 0 ? connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length : 0;
    const errorRate = totalMessages > 0 ? totalErrors / totalMessages * 100 : 0;
    return {
      totalConnections: this.connections.size,
      activeConnections,
      averageConnectionTime: Math.round(averageConnectionTime),
      totalMessages,
      totalBytes,
      errorRate: Math.round(errorRate * 100) / 100
    };
  }
  /**
   * Get connections by criteria
   */
  getConnectionsByCriteria(criteria) {
    const now = /* @__PURE__ */ new Date();
    return this.getAllConnections().filter((connection) => {
      if (criteria.platform && connection.metadata.platform !== criteria.platform) {
        return false;
      }
      if (criteria.userAgent && !connection.metadata.userAgent?.includes(criteria.userAgent)) {
        return false;
      }
      if (criteria.minConnectedTime) {
        const connectedTime = now.getTime() - connection.connectedAt.getTime();
        if (connectedTime < criteria.minConnectedTime) {
          return false;
        }
      }
      if (criteria.maxIdleTime) {
        const idleTime = now.getTime() - connection.lastPing.getTime();
        if (idleTime > criteria.maxIdleTime) {
          return false;
        }
      }
      return true;
    });
  }
  /**
   * Close connections matching criteria
   */
  async closeConnections(criteria) {
    let closedCount = 0;
    const reason = criteria.reason || "Server initiated close";
    try {
      let connectionsToClose = [];
      if (criteria.sessionIds) {
        connectionsToClose = criteria.sessionIds.map((id) => this.connections.get(id)).filter(Boolean);
      } else {
        connectionsToClose = this.getConnectionsByCriteria(criteria);
      }
      for (const connection of connectionsToClose) {
        try {
          connection.websocket.close(1e3, reason);
          await this.unregisterConnection(connection.sessionId);
          closedCount++;
        } catch (error) {
          this.logger.warn("Failed to close connection", {
            sessionId: connection.sessionId,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
      this.logger.info("Bulk connection close completed", {
        closedCount,
        totalConnections: this.connections.size,
        criteria
      });
    } catch (error) {
      this.logger.error("Failed to close connections", {
        error: error instanceof Error ? error.message : "Unknown error",
        criteria
      });
    }
    return closedCount;
  }
  /**
   * Start periodic cleanup of stale connections
   */
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 3e5);
  }
  /**
   * Clean up stale connections
   */
  async cleanupStaleConnections() {
    const maxIdleTime = 6e5;
    const staleConnections = this.getConnectionsByCriteria({ maxIdleTime });
    if (staleConnections.length > 0) {
      this.logger.info("Cleaning up stale connections", {
        staleCount: staleConnections.length,
        maxIdleTime
      });
      await this.closeConnections({
        sessionIds: staleConnections.map((c) => c.sessionId),
        reason: "Connection idle timeout"
      });
    }
  }
  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup() {
    this.logger.info("Connection management cleanup started");
    this.stopCleanupInterval();
    await this.closeConnections({
      sessionIds: Array.from(this.connections.keys()),
      reason: "Server shutting down"
    });
    this.connections.clear();
    this.connectionMetrics.clear();
    this.logger.info("Connection management cleanup completed");
  }
};

// src/services/websocket-transport.service.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
var WebSocketTransportService = class {
  constructor(env, logger2, errorHandler2, authService, connectionManager) {
    this.env = env;
    this.logger = logger2;
    this.errorHandler = errorHandler2;
    this.authService = authService;
    this.connectionManager = connectionManager;
    this.setupMessageHandlers();
  }
  static {
    __name(this, "WebSocketTransportService");
  }
  connections = /* @__PURE__ */ new Map();
  messageHandlers = /* @__PURE__ */ new Map();
  /**
   * Handle WebSocket upgrade request
   */
  async handleUpgrade(request) {
    try {
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);
      await this.acceptWebSocket(server, request);
      return new Response(null, {
        status: 101,
        webSocket: client
      });
    } catch (error) {
      this.logger.error("WebSocket upgrade failed", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return this.errorHandler.createErrorResponse(500, "WebSocket upgrade failed", "ws-upgrade");
    }
  }
  /**
   * Accept and configure WebSocket connection
   */
  async acceptWebSocket(websocket, request) {
    const metadata = {
      userAgent: request.headers.get("User-Agent") || void 0,
      ipAddress: request.headers.get("CF-Connecting-IP") || void 0,
      clientVersion: request.headers.get("X-Client-Version") || void 0,
      platform: request.headers.get("X-Client-Platform") || void 0
    };
    const tempConnection = {
      websocket,
      connectedAt: /* @__PURE__ */ new Date(),
      lastPing: /* @__PURE__ */ new Date(),
      subscriptions: /* @__PURE__ */ new Set(),
      metadata
    };
    websocket.addEventListener("message", async (event) => {
      await this.handleMessage(event, tempConnection);
    });
    websocket.addEventListener("close", async (event) => {
      await this.handleDisconnection(tempConnection, event.code, event.reason);
    });
    websocket.addEventListener("error", async (event) => {
      this.logger.error("WebSocket error", {
        sessionId: tempConnection.sessionId,
        error: "WebSocket connection error"
      });
    });
    await this.sendHandshake(websocket);
    this.logger.info("WebSocket connection accepted", { metadata });
  }
  /**
   * Send initial handshake message
   */
  async sendHandshake(websocket) {
    const handshake = {
      id: crypto.randomUUID(),
      type: "notification",
      method: "handshake",
      params: {
        serverVersion: "1.0.0",
        protocolVersion: "2024-11-05",
        capabilities: ["tools", "resources", "notifications", "streaming"],
        authRequired: true
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    websocket.send(JSON.stringify(handshake));
  }
  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(event, connection) {
    try {
      const data = JSON.parse(event.data);
      connection.lastPing = /* @__PURE__ */ new Date();
      const handler = this.messageHandlers.get(data.method || data.type);
      if (handler) {
        await handler(data, connection);
      } else {
        await this.handleUnknownMessage(data, connection);
      }
    } catch (error) {
      this.logger.error("Failed to handle WebSocket message", {
        sessionId: connection.sessionId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      await this.sendError(connection.websocket, "invalid_message", "Failed to parse message", "");
    }
  }
  /**
   * Setup message handlers for different message types
   */
  setupMessageHandlers() {
    this.messageHandlers.set("authenticate", this.handleAuthentication.bind(this));
    this.messageHandlers.set("ping", this.handlePing.bind(this));
    this.messageHandlers.set("pong", this.handlePong.bind(this));
    this.messageHandlers.set("tools/list", this.handleToolsList.bind(this));
    this.messageHandlers.set("tools/call", this.handleToolCall.bind(this));
    this.messageHandlers.set("subscribe", this.handleSubscribe.bind(this));
    this.messageHandlers.set("unsubscribe", this.handleUnsubscribe.bind(this));
  }
  /**
   * Handle authentication request
   */
  async handleAuthentication(message, connection) {
    try {
      const authRequest = message.params;
      const session = await this.authService.validateApiKey(authRequest.apiKey);
      if (!session) {
        await this.sendAuthResponse(connection.websocket, {
          success: false,
          error: "Invalid API key",
          serverInfo: {
            version: "1.0.0",
            capabilities: [],
            quotaLimits: { used: 0, limit: 0, resetAt: "", warningThreshold: 80 }
          }
        }, message.id);
        return;
      }
      connection.sessionId = session.id;
      await this.connectionManager.registerConnection(session.id, connection);
      this.connections.set(session.id, connection);
      const quotaInfo = await this.authService.getUserQuotaUsage(session.id);
      await this.sendAuthResponse(connection.websocket, {
        success: true,
        session,
        serverInfo: {
          version: "1.0.0",
          capabilities: ["tools", "resources", "notifications", "streaming"],
          quotaLimits: quotaInfo
        }
      }, message.id);
      this.logger.info("Client authenticated successfully", {
        sessionId: session.id,
        clientInfo: authRequest.clientInfo
      });
    } catch (error) {
      this.logger.error("Authentication failed", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      await this.sendError(connection.websocket, "auth_failed", "Authentication failed", message.id);
    }
  }
  /**
   * Handle ping messages for keepalive
   */
  async handlePing(message, connection) {
    const pong = {
      id: crypto.randomUUID(),
      type: "pong",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    connection.websocket.send(JSON.stringify(pong));
  }
  /**
   * Handle pong responses
   */
  async handlePong(message, connection) {
    connection.lastPing = /* @__PURE__ */ new Date();
  }
  /**
   * Handle tools list request
   */
  async handleToolsList(message, connection) {
    try {
      if (!connection.sessionId) {
        await this.sendError(connection.websocket, "not_authenticated", "Authentication required", message.id);
        return;
      }
      const tools = [];
      const response = {
        id: message.id,
        type: "response",
        result: { tools },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      connection.websocket.send(JSON.stringify(response));
    } catch (error) {
      await this.sendError(
        connection.websocket,
        "tools_list_failed",
        error instanceof Error ? error.message : "Unknown error",
        message.id
      );
    }
  }
  /**
   * Handle tool execution request
   */
  async handleToolCall(message, connection) {
    try {
      if (!connection.sessionId) {
        await this.sendError(connection.websocket, "not_authenticated", "Authentication required", message.id);
        return;
      }
      const result = { message: "Tool execution not yet implemented" };
      const response = {
        id: message.id,
        type: "response",
        result,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      connection.websocket.send(JSON.stringify(response));
    } catch (error) {
      await this.sendError(
        connection.websocket,
        "tool_call_failed",
        error instanceof Error ? error.message : "Unknown error",
        message.id
      );
    }
  }
  /**
   * Handle subscription to notifications
   */
  async handleSubscribe(message, connection) {
    try {
      const { toolName } = message.params;
      if (!connection.sessionId) {
        await this.sendError(connection.websocket, "not_authenticated", "Authentication required", message.id);
        return;
      }
      connection.subscriptions.add(toolName);
      const response = {
        id: message.id,
        type: "response",
        result: { subscribed: toolName },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      connection.websocket.send(JSON.stringify(response));
      this.logger.info("Client subscribed to notifications", {
        sessionId: connection.sessionId,
        toolName
      });
    } catch (error) {
      await this.sendError(
        connection.websocket,
        "subscribe_failed",
        error instanceof Error ? error.message : "Unknown error",
        message.id
      );
    }
  }
  /**
   * Handle unsubscription from notifications
   */
  async handleUnsubscribe(message, connection) {
    try {
      const { toolName } = message.params;
      if (!connection.sessionId) {
        await this.sendError(connection.websocket, "not_authenticated", "Authentication required", message.id);
        return;
      }
      connection.subscriptions.delete(toolName);
      const response = {
        id: message.id,
        type: "response",
        result: { unsubscribed: toolName },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      connection.websocket.send(JSON.stringify(response));
    } catch (error) {
      await this.sendError(
        connection.websocket,
        "unsubscribe_failed",
        error instanceof Error ? error.message : "Unknown error",
        message.id
      );
    }
  }
  /**
   * Handle unknown message types
   */
  async handleUnknownMessage(message, connection) {
    await this.sendError(
      connection.websocket,
      "unknown_method",
      `Unknown method: ${message.method}`,
      message.id
    );
  }
  /**
   * Handle client disconnection
   */
  async handleDisconnection(connection, code, reason) {
    if (connection.sessionId) {
      this.connections.delete(connection.sessionId);
      await this.connectionManager.unregisterConnection(connection.sessionId);
      this.logger.info("Client disconnected", {
        sessionId: connection.sessionId,
        code,
        reason,
        duration: Date.now() - connection.connectedAt.getTime()
      });
    }
  }
  /**
   * Send authentication response
   */
  async sendAuthResponse(websocket, response, messageId) {
    const message = {
      id: messageId,
      type: "response",
      result: response,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    websocket.send(JSON.stringify(message));
  }
  /**
   * Send error message
   */
  async sendError(websocket, code, message, messageId) {
    const errorMessage = {
      id: messageId,
      type: "response",
      error: {
        code,
        message
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    websocket.send(JSON.stringify(errorMessage));
  }
  /**
   * Broadcast event to subscribed clients
   */
  async broadcastEvent(event) {
    const targetConnections = event.data.targetUsers ? event.data.targetUsers.map((userId) => this.connections.get(userId)).filter(Boolean) : Array.from(this.connections.values());
    const message = {
      id: crypto.randomUUID(),
      type: "notification",
      method: "event",
      params: event,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const messageStr = JSON.stringify(message);
    for (const connection of targetConnections) {
      if (connection) {
        try {
          connection.websocket.send(messageStr);
        } catch (error) {
          this.logger.warn("Failed to send event to client", {
            sessionId: connection.sessionId,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    }
  }
  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const authenticated = Array.from(this.connections.values()).filter((c) => c.sessionId);
    const subscriptions = {};
    for (const connection of authenticated) {
      for (const sub of connection.subscriptions) {
        subscriptions[sub] = (subscriptions[sub] || 0) + 1;
      }
    }
    return {
      totalConnections: this.connections.size,
      authenticatedConnections: authenticated.length,
      subscriptions
    };
  }
  /**
   * Close all connections (for shutdown)
   */
  async closeAllConnections() {
    for (const connection of this.connections.values()) {
      try {
        connection.websocket.close(1001, "Server shutting down");
      } catch (error) {
      }
    }
    this.connections.clear();
  }
};

// src/remote-mcp-server.ts
init_logger_util();

// src/utils/error-handler.util.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();

// src/types/mcp.types.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
var MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32e3,
  TOOL_NOT_FOUND: -32001,
  AUTHENTICATION_FAILED: -32002,
  AUTHORIZATION_FAILED: -32003,
  QUOTA_EXCEEDED: -32004,
  RATE_LIMITED: -32005,
  VALIDATION_FAILED: -32006,
  EXTERNAL_API_ERROR: -32007,
  CACHE_ERROR: -32008,
  CONFIGURATION_ERROR: -32009
};

// src/utils/error-handler.util.ts
var ErrorHandlerUtil = class {
  static {
    __name(this, "ErrorHandlerUtil");
  }
  logger;
  constructor(logger2) {
    this.logger = logger2;
  }
  /**
   * Create standardized HTTP error response
   */
  createErrorResponse(code, message, id = null, details) {
    const errorResponse = {
      jsonrpc: "2.0",
      id,
      error: {
        code: this.mapHttpToMCPErrorCode(code),
        message,
        data: details ? { details } : void 0
      }
    };
    this.logger.error("HTTP Error Response Created", {
      httpCode: code,
      mcpCode: errorResponse.error.code,
      message,
      details,
      requestId: id
    });
    return new Response(JSON.stringify(errorResponse), {
      status: code,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  /**
   * Create MCP error response for JSON-RPC
   */
  createMCPErrorResponse(code, message, id = null, data) {
    const errorResponse = {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        data
      }
    };
    this.logger.error("MCP Error Response Created", {
      code,
      message,
      data,
      requestId: id
    });
    return errorResponse;
  }
  /**
   * Wrap async function with error handling
   */
  async wrapAsync(fn, context) {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error, context);
      throw error;
    }
  }
  /**
   * Wrap synchronous function with error handling
   */
  wrapSync(fn, context) {
    try {
      return fn();
    } catch (error) {
      this.handleError(error, context);
      throw error;
    }
  }
  /**
   * Handle and log errors with context
   */
  handleError(error, context) {
    const errorDetails = this.extractErrorDetails(error, context);
    this.logger.error("Error handled", {
      code: errorDetails.code,
      message: errorDetails.message,
      details: errorDetails.details,
      context: errorDetails.context,
      stack: errorDetails.stack
    });
    return errorDetails;
  }
  /**
   * Extract structured error details from various error types
   */
  extractErrorDetails(error, context) {
    let code = 500;
    let message = "Internal Server Error";
    let details;
    let stack;
    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
      if (error.name === "ValidationError") {
        code = 400;
      } else if (error.name === "NotFoundError" || error.name === "ToolNotFoundError") {
        code = 404;
      } else if (error.name === "AuthenticationError") {
        code = 401;
      } else if (error.name === "AuthorizationError") {
        code = 403;
      } else if (error.name === "RateLimitError") {
        code = 429;
      } else if (error.name === "YouTubeAPIRequestError") {
        const youtubeError = error;
        code = youtubeError.code || 500;
        details = youtubeError.status;
      } else if (error.name === "TranscriptNotAvailableError") {
        code = 404;
        details = "Transcript not available for this video";
      }
    } else if (typeof error === "string") {
      message = error;
    } else if (error && typeof error === "object") {
      const errorObj = error;
      message = errorObj.message || errorObj.error || "Unknown error";
      code = errorObj.code || errorObj.status || 500;
      details = errorObj.details;
    }
    return {
      code,
      message,
      details,
      stack,
      context
    };
  }
  /**
   * Map HTTP status codes to MCP error codes
   */
  mapHttpToMCPErrorCode(httpCode) {
    switch (httpCode) {
      case 400:
        return MCPErrorCodes.INVALID_REQUEST;
      case 401:
        return MCPErrorCodes.INVALID_REQUEST;
      // Use closest available
      case 403:
        return MCPErrorCodes.INVALID_REQUEST;
      // Use closest available
      case 404:
        return MCPErrorCodes.METHOD_NOT_FOUND;
      // Use closest available
      case 405:
        return MCPErrorCodes.METHOD_NOT_FOUND;
      case 408:
        return MCPErrorCodes.INTERNAL_ERROR;
      // Use closest available
      case 409:
        return MCPErrorCodes.INTERNAL_ERROR;
      // Use closest available
      case 422:
        return MCPErrorCodes.INVALID_PARAMS;
      case 429:
        return MCPErrorCodes.RATE_LIMITED;
      case 500:
        return MCPErrorCodes.INTERNAL_ERROR;
      case 501:
        return MCPErrorCodes.INTERNAL_ERROR;
      // Use closest available
      case 503:
        return MCPErrorCodes.INTERNAL_ERROR;
      // Use closest available
      default:
        return MCPErrorCodes.INTERNAL_ERROR;
    }
  }
  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const details = this.extractErrorDetails(error);
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    return retryableCodes.includes(details.code);
  }
  /**
   * Get retry delay for exponential backoff
   */
  getRetryDelay(attempt, baseDelay = 1e3, maxDelay = 3e4) {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }
  /**
   * Execute function with retry logic
   */
  async withRetry(fn, maxRetries = 3, baseDelay = 1e3, context) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          this.handleError(error, { ...context, metadata: { attempt, maxRetries } });
          throw error;
        }
        const delay = this.getRetryDelay(attempt, baseDelay);
        this.logger.warn("Retrying after error", {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: error instanceof Error ? error.message : String(error),
          context
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }
  /**
   * Create user-friendly error message
   */
  createUserFriendlyMessage(error) {
    const details = this.extractErrorDetails(error);
    switch (details.code) {
      case 400:
        return "Invalid request. Please check your input and try again.";
      case 401:
        return "Authentication required. Please provide valid credentials.";
      case 403:
        return "Access denied. You do not have permission to perform this action.";
      case 404:
        return "The requested resource was not found.";
      case 429:
        return "Rate limit exceeded. Please wait a moment and try again.";
      case 500:
        return "An internal server error occurred. Please try again later.";
      case 503:
        return "Service temporarily unavailable. Please try again later.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }
  /**
   * Sanitize error for client response (remove sensitive information)
   */
  sanitizeError(error, includeStack = false) {
    const details = this.extractErrorDetails(error);
    return {
      code: details.code,
      message: details.message,
      details: details.details,
      ...includeStack && { stack: details.stack }
    };
  }
};

// src/utils/tool-registry.util.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
var ToolRegistryUtil = class {
  static {
    __name(this, "ToolRegistryUtil");
  }
  tools = /* @__PURE__ */ new Map();
  config;
  logger;
  initialized = false;
  constructor(config, logger2) {
    this.config = config;
    this.logger = logger2;
  }
  /**
   * Initialize the tool registry
   */
  async initialize() {
    try {
      await this.registerBuiltInTools();
      this.initialized = true;
      this.logger.info("Tool registry initialized", {
        toolCount: this.tools.size,
        tools: Array.from(this.tools.keys())
      });
    } catch (error) {
      this.logger.error("Failed to initialize tool registry", {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  /**
   * Register a new tool
   */
  register(tool) {
    const validation = this.validateTool(tool);
    if (!validation.valid) {
      const errorMessage = validation.errors.map((e) => e.message).join(", ");
      throw new Error(`Invalid tool definition: ${errorMessage}`);
    }
    if (this.tools.has(tool.name)) {
      this.logger.warn("Overwriting existing tool", { toolName: tool.name });
    }
    this.tools.set(tool.name, tool);
    this.logger.info("Tool registered", {
      toolName: tool.name,
      description: tool.description
    });
  }
  /**
   * Unregister a tool
   */
  unregister(toolName) {
    const existed = this.tools.has(toolName);
    this.tools.delete(toolName);
    if (existed) {
      this.logger.info("Tool unregistered", { toolName });
    }
    return existed;
  }
  /**
   * Get a specific tool
   */
  get(toolName) {
    return this.tools.get(toolName);
  }
  /**
   * List all registered tools
   */
  list() {
    return Array.from(this.tools.values());
  }
  /**
   * Check if a tool exists
   */
  has(toolName) {
    return this.tools.has(toolName);
  }
  /**
   * Clear all tools
   */
  clear() {
    const toolCount = this.tools.size;
    this.tools.clear();
    this.logger.info("All tools cleared", { clearedCount: toolCount });
  }
  /**
   * Get tool count
   */
  count() {
    return this.tools.size;
  }
  /**
   * Get registered tool count (alias for external interface)
   */
  getRegisteredToolCount() {
    return this.tools.size;
  }
  /**
   * List tools for MCP response
   */
  listTools() {
    return this.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }
  /**
   * Execute a tool with comprehensive error handling
   */
  async executeTool(toolName, input, context) {
    const startTime = Date.now();
    this.logger.info("Executing tool", {
      toolName,
      requestId: context.requestId,
      userId: context.auth?.userId
    });
    try {
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new ToolNotFoundError(`Tool '${toolName}' not found`);
      }
      const validation = this.validateInput(tool.inputSchema, input);
      if (!validation.valid) {
        const errorMessage = validation.errors.map((e) => `${e.path}: ${e.message}`).join(", ");
        throw new ValidationError(`Input validation failed: ${errorMessage}`);
      }
      const result = await tool.handler(input, context);
      const executionTime = Date.now() - startTime;
      this.logger.info("Tool executed successfully", {
        toolName,
        executionTime,
        requestId: context.requestId
      });
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error("Tool execution failed", {
        toolName,
        executionTime,
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error)
      });
      if (error instanceof ToolNotFoundError) {
        throw new MCPToolError(MCPErrorCodes.TOOL_NOT_FOUND, error.message);
      }
      if (error instanceof ValidationError) {
        throw new MCPToolError(MCPErrorCodes.VALIDATION_FAILED, error.message);
      }
      if (error instanceof MCPToolError) {
        throw error;
      }
      throw new MCPToolError(
        MCPErrorCodes.INTERNAL_ERROR,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  /**
   * Validate tool definition
   */
  validateTool(tool) {
    const errors = [];
    if (!tool.name || typeof tool.name !== "string") {
      errors.push({
        path: "name",
        message: "Tool name is required and must be a string",
        code: "MISSING_NAME"
      });
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(tool.name)) {
      errors.push({
        path: "name",
        message: "Tool name must start with a letter and contain only letters, numbers, and underscores",
        code: "INVALID_NAME"
      });
    }
    if (!tool.description || typeof tool.description !== "string") {
      errors.push({
        path: "description",
        message: "Tool description is required and must be a string",
        code: "MISSING_DESCRIPTION"
      });
    }
    if (!tool.inputSchema || typeof tool.inputSchema !== "object") {
      errors.push({
        path: "inputSchema",
        message: "Tool input schema is required and must be a valid JSON Schema",
        code: "MISSING_SCHEMA"
      });
    }
    if (!tool.handler || typeof tool.handler !== "function") {
      errors.push({
        path: "handler",
        message: "Tool handler is required and must be a function",
        code: "MISSING_HANDLER"
      });
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
  /**
   * Validate input against JSON Schema
   */
  validateInput(schema, input) {
    const errors = [];
    try {
      if (schema.type) {
        const actualType = this.getJSONType(input);
        if (schema.type !== actualType) {
          errors.push({
            path: "",
            message: `Expected type '${schema.type}', got '${actualType}'`,
            code: "TYPE_MISMATCH"
          });
        }
      }
      if (schema.type === "object" && schema.required && typeof input === "object" && input !== null) {
        const obj = input;
        for (const requiredProp of schema.required) {
          if (!(requiredProp in obj)) {
            errors.push({
              path: requiredProp,
              message: `Required property '${requiredProp}' is missing`,
              code: "MISSING_PROPERTY"
            });
          }
        }
      }
      if (schema.enum && !schema.enum.includes(input)) {
        errors.push({
          path: "",
          message: `Value must be one of: ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}`,
          code: "ENUM_VIOLATION"
        });
      }
      if (schema.type === "string" && typeof input === "string") {
        if (schema.minLength !== void 0 && input.length < schema.minLength) {
          errors.push({
            path: "",
            message: `String length must be at least ${schema.minLength}`,
            code: "MIN_LENGTH"
          });
        }
        if (schema.maxLength !== void 0 && input.length > schema.maxLength) {
          errors.push({
            path: "",
            message: `String length must be at most ${schema.maxLength}`,
            code: "MAX_LENGTH"
          });
        }
      }
      if (schema.type === "number" && typeof input === "number") {
        if (schema.minimum !== void 0 && input < schema.minimum) {
          errors.push({
            path: "",
            message: `Number must be at least ${schema.minimum}`,
            code: "MIN_VALUE"
          });
        }
        if (schema.maximum !== void 0 && input > schema.maximum) {
          errors.push({
            path: "",
            message: `Number must be at most ${schema.maximum}`,
            code: "MAX_VALUE"
          });
        }
      }
    } catch (error) {
      errors.push({
        path: "",
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        code: "VALIDATION_ERROR"
      });
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
  /**
   * Get JSON type of a value
   */
  getJSONType(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  }
  /**
   * Calculate consistency score based on video performance variance
   */
  calculateConsistencyScore(videos) {
    if (videos.length < 2) return 100;
    const scores = videos.map((v) => v.performanceScore);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
    const consistencyScore = Math.max(0, 100 - coefficientOfVariation * 100);
    return Math.round(consistencyScore * 100) / 100;
  }
  /**
   * Parse ISO 8601 duration to seconds
   */
  parseDurationToSeconds(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || "0");
    const minutes = parseInt(match[2] || "0");
    const seconds = parseInt(match[3] || "0");
    return hours * 3600 + minutes * 60 + seconds;
  }
  /**
   * Identify channel strengths based on performance metrics
   */
  identifyChannelStrengths(avgViews, avgEngagement, subscriberEngagementRate, videosPerWeek) {
    const strengths = [];
    if (avgViews > 1e5) strengths.push("High viewership");
    if (avgEngagement > 5) strengths.push("Excellent engagement");
    else if (avgEngagement > 3) strengths.push("Good engagement");
    if (subscriberEngagementRate > 50) strengths.push("Strong subscriber loyalty");
    else if (subscriberEngagementRate > 20) strengths.push("Good subscriber engagement");
    if (videosPerWeek > 3) strengths.push("High content frequency");
    else if (videosPerWeek > 1) strengths.push("Consistent content schedule");
    if (strengths.length === 0) strengths.push("Growth opportunity");
    return strengths;
  }
  /**
   * Analyze engagement distribution across videos
   */
  analyzeEngagementDistribution(videoMetrics) {
    let high = 0, medium = 0, low = 0;
    const totalEngagement = videoMetrics.reduce((sum, v) => sum + v.engagementScore, 0);
    videoMetrics.forEach((video) => {
      if (video.engagementScore > 5) high++;
      else if (video.engagementScore > 2) medium++;
      else low++;
    });
    return {
      high,
      medium,
      low,
      averageEngagement: videoMetrics.length > 0 ? Math.round(totalEngagement / videoMetrics.length * 1e4) / 1e4 : 0
    };
  }
  /**
   * Perform competitive comparison between channels
   */
  performCompetitiveComparison(channelAnalyses) {
    const validChannels = channelAnalyses.filter((c) => !c.error && c.performance);
    if (validChannels.length === 0) {
      return {
        leader: null,
        rankings: [],
        insights: ["No valid channels to compare"]
      };
    }
    const scoredChannels = validChannels.map((channel) => {
      const perf = channel.performance;
      const viewScore = Math.min(perf.averageViews / 1e5 * 40, 40);
      const engagementScore = Math.min(perf.averageEngagementRate * 6, 30);
      const consistencyScore = channel.engagementAnalysis ? channel.engagementAnalysis.consistency / 100 * 20 : 10;
      const frequencyScore = Math.min(perf.videosPerWeek * 2, 10);
      const totalScore = viewScore + engagementScore + consistencyScore + frequencyScore;
      return {
        channel,
        score: Math.round(totalScore * 100) / 100
      };
    });
    scoredChannels.sort((a, b) => b.score - a.score);
    const rankings = scoredChannels.map((item, index) => ({
      rank: index + 1,
      channel: item.channel,
      score: item.score
    }));
    const leader = rankings[0];
    const insights = [];
    if (leader) {
      insights.push(`${leader.channel.channel.title} leads with a score of ${leader.score}`);
      const topPerformer = validChannels.reduce(
        (prev, curr) => prev.performance.averageViews > curr.performance.averageViews ? prev : curr
      );
      insights.push(`Highest average views: ${topPerformer.channel.title} (${topPerformer.performance.averageViews.toLocaleString()})`);
      const mostEngaged = validChannels.reduce(
        (prev, curr) => prev.performance.averageEngagementRate > curr.performance.averageEngagementRate ? prev : curr
      );
      insights.push(`Best engagement rate: ${mostEngaged.channel.title} (${mostEngaged.performance.averageEngagementRate}%)`);
      const mostConsistent = validChannels.reduce(
        (prev, curr) => prev.performance.videosPerWeek > curr.performance.videosPerWeek ? prev : curr
      );
      insights.push(`Most consistent publisher: ${mostConsistent.channel.title} (${mostConsistent.performance.videosPerWeek} videos/week)`);
    }
    return {
      leader: leader ? leader.channel : null,
      rankings,
      insights
    };
  }
  /**
   * Format seconds to readable time format
   */
  formatSecondsToTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
  /**
   * Analyze keyword matches in video content
   */
  analyzeKeywordMatches(keywords, title, description, tags) {
    const foundKeywords = [];
    let titleMatches = 0;
    let descriptionMatches = 0;
    let tagMatches = 0;
    const titleLower = title.toLowerCase();
    const descriptionLower = description.toLowerCase();
    const tagsLower = tags.map((tag) => tag.toLowerCase());
    keywords.forEach((keyword) => {
      const keywordLower = keyword.toLowerCase();
      let found = false;
      if (titleLower.includes(keywordLower)) {
        titleMatches++;
        found = true;
      }
      if (descriptionLower.includes(keywordLower)) {
        descriptionMatches++;
        found = true;
      }
      if (tagsLower.some((tag) => tag.includes(keywordLower))) {
        tagMatches++;
        found = true;
      }
      if (found) {
        foundKeywords.push(keyword);
      }
    });
    const maxPossibleMatches = keywords.length;
    const titleScore = maxPossibleMatches > 0 ? titleMatches / maxPossibleMatches * 50 : 0;
    const descriptionScore = maxPossibleMatches > 0 ? descriptionMatches / maxPossibleMatches * 30 : 0;
    const tagScore = maxPossibleMatches > 0 ? tagMatches / maxPossibleMatches * 20 : 0;
    const relevanceScore = titleScore + descriptionScore + tagScore;
    return {
      foundKeywords,
      titleMatches,
      descriptionMatches,
      tagMatches,
      relevanceScore: Math.round(relevanceScore * 100) / 100
    };
  }
  /**
   * Generate insights from keyword search results
   */
  generateKeywordSearchInsights(keywords, keywordStats, results) {
    const recommendations = [];
    let topKeyword = null;
    let maxCount = 0;
    Object.entries(keywordStats).forEach(([keyword, stats]) => {
      if (stats.count > maxCount) {
        maxCount = stats.count;
        topKeyword = keyword;
      }
    });
    const totalRelevance = results.reduce((sum, result) => sum + result.keywordAnalysis.relevanceScore, 0);
    const averageRelevanceScore = results.length > 0 ? Math.round(totalRelevance / results.length * 100) / 100 : 0;
    if (results.length === 0) {
      recommendations.push("No results found. Try broader keywords or different search terms.");
    } else {
      if (averageRelevanceScore < 30) {
        recommendations.push("Low relevance scores detected. Consider refining your keywords for better matches.");
      }
      if (topKeyword) {
        recommendations.push(`"${topKeyword}" appears most frequently in search results (${maxCount} videos).`);
      }
      const highRelevanceVideos = results.filter((r) => r.keywordAnalysis.relevanceScore > 70).length;
      if (highRelevanceVideos > 0) {
        recommendations.push(`${highRelevanceVideos} video(s) show high keyword relevance (>70%).`);
      }
      const underrepresentedKeywords = keywords.filter((k) => keywordStats[k.toLowerCase()].count < 2);
      if (underrepresentedKeywords.length > 0) {
        recommendations.push(`Content opportunity: Keywords "${underrepresentedKeywords.join('", "')}" have limited coverage.`);
      }
    }
    return {
      topKeyword,
      averageRelevanceScore,
      recommendations
    };
  }
  /**
   * Extract topics from text content
   */
  extractTopicsFromText(text) {
    const topics = [];
    const lowerText = text.toLowerCase();
    const topicKeywords = [
      "gaming",
      "music",
      "tech",
      "technology",
      "ai",
      "tutorial",
      "review",
      "unboxing",
      "cooking",
      "fitness",
      "workout",
      "travel",
      "vlog",
      "comedy",
      "news",
      "politics",
      "sports",
      "education",
      "science",
      "health",
      "beauty",
      "fashion",
      "diy",
      "art",
      "crypto",
      "blockchain",
      "investing",
      "business",
      "startup",
      "productivity",
      "motivation",
      "lifestyle",
      "food",
      "recipe",
      "movie",
      "film",
      "tv",
      "anime",
      "minecraft",
      "fortnite",
      "valorant",
      "league",
      "pokemon",
      "react",
      "javascript",
      "python",
      "coding",
      "programming",
      "web",
      "mobile",
      "app",
      "ios",
      "android"
    ];
    topicKeywords.forEach((keyword) => {
      if (lowerText.includes(keyword)) {
        topics.push(keyword);
      }
    });
    return [...new Set(topics)];
  }
  /**
   * Generate trend predictions and recommendations
   */
  generateTrendPredictions(topTopics, durationPatterns, bestPublishHours, trendingVideos) {
    const predictions = [];
    if (topTopics.length > 0) {
      const dominantTopic = topTopics[0];
      predictions.push(`"${dominantTopic.topic}" is currently trending with ${dominantTopic.frequency} videos in top results.`);
      if (topTopics.length > 1) {
        predictions.push(`Emerging topics: ${topTopics.slice(1, 3).map((t) => t.topic).join(", ")}`);
      }
    }
    const totalVideos = durationPatterns.short + durationPatterns.medium + durationPatterns.long;
    if (totalVideos > 0) {
      const shortPercentage = durationPatterns.short / totalVideos * 100;
      const mediumPercentage = durationPatterns.medium / totalVideos * 100;
      if (shortPercentage > 60) {
        predictions.push("Short-form content (<5min) is dominating trending videos. Consider creating bite-sized content.");
      } else if (mediumPercentage > 50) {
        predictions.push("Medium-form content (5-20min) shows strong performance. Detailed tutorials and reviews are trending.");
      } else {
        predictions.push("Long-form content (>20min) is performing well. In-depth analysis and comprehensive guides are valued.");
      }
    }
    if (bestPublishHours.length > 0) {
      const topHour = bestPublishHours[0];
      predictions.push(`Optimal publish time: ${topHour.hour}:00 UTC (${topHour.videoCount} trending videos published at this hour).`);
    }
    const highEngagementVideos = trendingVideos.filter((v) => v.statistics.engagementRate > 5).length;
    if (highEngagementVideos > trendingVideos.length * 0.3) {
      predictions.push("High engagement rates (>5%) are common in trending content. Focus on community interaction.");
    }
    return predictions;
  }
  /**
   * Identify content opportunity based on analysis
   */
  identifyContentOpportunity(topTopics, durationPatterns) {
    if (topTopics.length === 0) {
      return "Diverse content landscape - opportunity for niche specialization";
    }
    const totalDuration = durationPatterns.short + durationPatterns.medium + durationPatterns.long;
    const dominantFormat = totalDuration > 0 ? durationPatterns.short > Math.max(durationPatterns.medium, durationPatterns.long) ? "short" : durationPatterns.medium > durationPatterns.long ? "medium" : "long" : "unknown";
    const dominantTopic = topTopics[0].topic;
    return `${dominantFormat}-form ${dominantTopic} content shows strong trending potential`;
  }
  /**
   * Generate trend insights from analysis data
   */
  generateTrendInsights(sortedTrends, trendingKeywords, category, timeframe) {
    const insights = [];
    if (sortedTrends.length === 0) {
      insights.push("No significant trends detected in the current timeframe.");
      return insights;
    }
    const topTrend = sortedTrends[0];
    insights.push(`Highest trending video: "${topTrend.video.title}" (trend score: ${topTrend.metrics.trendScore})`);
    if (trendingKeywords.length > 0) {
      const topKeyword = trendingKeywords[0];
      insights.push(`Most frequent trending keyword: "${topKeyword.keyword}" (appears in ${topKeyword.frequency} videos)`);
    }
    const highEngagementTrends = sortedTrends.filter((t) => t.metrics.engagementRate > 5);
    if (highEngagementTrends.length > 0) {
      insights.push(`${highEngagementTrends.length} trending videos show high engagement (>5%)`);
    }
    const recentTrends = sortedTrends.filter((t) => t.metrics.daysSincePublished <= 3);
    if (recentTrends.length > sortedTrends.length * 0.5) {
      insights.push("Most trends are very recent (within 3 days) - indicating rapid viral spread");
    }
    if (category) {
      insights.push(`${category} category shows strong trending activity in the ${timeframe} timeframe`);
    }
    return insights;
  }
  /**
   * Generate trend recommendations
   */
  generateTrendRecommendations(trendingKeywords, emergingTrends, timeframe) {
    const recommendations = [];
    if (trendingKeywords.length > 0) {
      const topKeywords = trendingKeywords.slice(0, 3).map((k) => k.keyword).join(", ");
      recommendations.push(`Consider creating content around trending topics: ${topKeywords}`);
    }
    if (emergingTrends.length > 0) {
      const emergingTopics = emergingTrends.slice(0, 2).map((k) => k.keyword).join(", ");
      recommendations.push(`Early opportunity: "${emergingTopics}" are emerging trends with growth potential`);
    }
    if (timeframe === "24h") {
      recommendations.push("Rapid content creation recommended - trends are moving fast in the 24h window");
    } else if (timeframe === "30d") {
      recommendations.push("Long-term trend analysis shows stable patterns - good for strategic content planning");
    }
    if (recommendations.length === 0) {
      recommendations.push("Monitor trends closely and create content that aligns with audience interests");
    }
    return recommendations;
  }
  /**
   * Analyze channel performance and generate insights
   */
  analyzeChannelPerformance(channel, recentVideos) {
    const stats = channel.statistics;
    const subscriberCount = parseInt(stats?.subscriberCount || "0");
    const viewCount = parseInt(stats?.viewCount || "0");
    const videoCount = parseInt(stats?.videoCount || "0");
    const avgViewsPerVideo = videoCount > 0 ? Math.round(viewCount / videoCount) : 0;
    const avgViewsPerSubscriber = subscriberCount > 0 ? Math.round(viewCount / subscriberCount) : 0;
    let recentPerformance = null;
    if (recentVideos.length > 0) {
      const totalRecentViews = recentVideos.reduce((sum, video) => sum + parseInt(video.statistics?.viewCount || "0"), 0);
      const avgRecentViews = Math.round(totalRecentViews / recentVideos.length);
      const totalRecentLikes = recentVideos.reduce((sum, video) => sum + parseInt(video.statistics?.likeCount || "0"), 0);
      const avgEngagement = totalRecentViews > 0 ? Math.round(totalRecentLikes / totalRecentViews * 1e4) / 100 : 0;
      recentPerformance = {
        avgViewsLast10Videos: avgRecentViews,
        avgEngagementRate: avgEngagement,
        performanceVsChannel: avgViewsPerVideo > 0 ? Math.round(avgRecentViews / avgViewsPerVideo * 100) : 0
      };
    }
    const growthIndicators = {
      subscriberToVideoRatio: videoCount > 0 ? Math.round(subscriberCount / videoCount) : 0,
      viewToSubscriberRatio: avgViewsPerSubscriber,
      contentFrequency: this.estimateContentFrequency(recentVideos)
    };
    return {
      channelMetrics: {
        avgViewsPerVideo,
        avgViewsPerSubscriber,
        subscriberCount,
        viewCount,
        videoCount
      },
      recentPerformance,
      growthIndicators,
      insights: this.generateChannelInsights(stats, recentPerformance, growthIndicators)
    };
  }
  /**
   * Generate competitor search queries based on channel info
   */
  generateCompetitorSearchQueries(title, description) {
    const queries = [];
    const titleWords = title.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
    if (titleWords.length > 0) {
      queries.push(titleWords.slice(0, 2).join(" "));
    }
    const topics = this.extractTopicsFromText(description);
    topics.slice(0, 2).forEach((topic) => {
      if (!queries.includes(topic)) {
        queries.push(topic);
      }
    });
    queries.push("similar channels", "youtube creator");
    return queries;
  }
  /**
   * Find competitor channels
   */
  async findCompetitors(youtubeService, searchQueries, excludeChannelId) {
    const competitors = [];
    let quotaCost = 0;
    for (const query of searchQueries) {
      try {
        const searchResponse = await youtubeService.makeAPIRequest("search", {
          part: "snippet",
          type: "channel",
          q: query,
          maxResults: "5"
        });
        quotaCost += 100;
        if (searchResponse.items) {
          const channelIds = searchResponse.items.map((item) => item.id.channelId).filter((id) => id !== excludeChannelId).slice(0, 3);
          if (channelIds.length > 0) {
            const channelsResponse = await youtubeService.makeAPIRequest("channels", {
              part: "snippet,statistics",
              id: channelIds.join(",")
            });
            quotaCost += 1;
            if (channelsResponse.items) {
              channelsResponse.items.forEach((channel) => {
                competitors.push({
                  id: channel.id,
                  title: channel.snippet.title,
                  subscriberCount: parseInt(channel.statistics?.subscriberCount || "0"),
                  videoCount: parseInt(channel.statistics?.videoCount || "0"),
                  viewCount: parseInt(channel.statistics?.viewCount || "0")
                });
              });
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
    const uniqueCompetitors = competitors.filter((comp, index, self) => self.findIndex((c) => c.id === comp.id) === index).sort((a, b) => b.subscriberCount - a.subscriberCount).slice(0, 5);
    return {
      competitors: uniqueCompetitors,
      analysis: this.analyzeCompetitors(uniqueCompetitors),
      quotaCost
    };
  }
  /**
   * Generate channel recommendations
   */
  generateChannelRecommendations(channelInsights, recentVideos, competitorAnalysis) {
    const recommendations = [];
    const insights = channelInsights.insights;
    const recent = channelInsights.recentPerformance;
    if (recent && recent.performanceVsChannel < 80) {
      recommendations.push("Recent videos are underperforming vs channel average. Consider analyzing successful content patterns.");
    }
    if (insights.includes("low engagement")) {
      recommendations.push("Focus on improving audience engagement through calls-to-action and interactive content.");
    }
    if (insights.includes("inconsistent posting")) {
      recommendations.push("Establish a consistent posting schedule to improve audience retention and growth.");
    }
    const metrics = channelInsights.channelMetrics;
    if (metrics.avgViewsPerSubscriber < 10) {
      recommendations.push("Low views per subscriber ratio. Focus on creating content that resonates with your existing audience.");
    }
    if (metrics.subscriberCount > 1e3 && metrics.avgViewsPerVideo < metrics.subscriberCount * 0.1) {
      recommendations.push("Views per video are low relative to subscriber count. Consider refreshing content strategy.");
    }
    if (competitorAnalysis && competitorAnalysis.competitors.length > 0) {
      const avgCompetitorSubs = competitorAnalysis.competitors.reduce((sum, comp) => sum + comp.subscriberCount, 0) / competitorAnalysis.competitors.length;
      if (metrics.subscriberCount < avgCompetitorSubs * 0.5) {
        recommendations.push("Significant growth opportunity exists. Analyze competitor content strategies and posting patterns.");
      }
    }
    if (recentVideos.length > 0) {
      const avgDuration = recentVideos.reduce((sum, video) => sum + this.parseDurationToSeconds(video.contentDetails?.duration || "PT0S"), 0) / recentVideos.length;
      if (avgDuration < 300) {
        recommendations.push("Consider creating longer-form content to increase watch time and algorithm performance.");
      } else if (avgDuration > 1200) {
        recommendations.push("Experiment with shorter, more digestible content to improve retention rates.");
      }
    }
    if (recommendations.length === 0) {
      recommendations.push("Channel shows strong performance metrics. Continue current strategy and monitor trends.");
    }
    return recommendations;
  }
  /**
   * Estimate content frequency from recent videos
   */
  estimateContentFrequency(recentVideos) {
    if (recentVideos.length < 2) return "Unknown";
    const dates = recentVideos.map((video) => new Date(video.snippet.publishedAt)).sort((a, b) => b.getTime() - a.getTime());
    let totalDays = 0;
    for (let i = 0; i < dates.length - 1; i++) {
      totalDays += (dates[i].getTime() - dates[i + 1].getTime()) / (1e3 * 60 * 60 * 24);
    }
    const avgDaysBetween = totalDays / (dates.length - 1);
    if (avgDaysBetween <= 1.5) return "Daily";
    if (avgDaysBetween <= 3.5) return "Every 2-3 days";
    if (avgDaysBetween <= 7.5) return "Weekly";
    if (avgDaysBetween <= 15) return "Bi-weekly";
    if (avgDaysBetween <= 31) return "Monthly";
    return "Irregular";
  }
  /**
   * Generate channel insights
   */
  generateChannelInsights(stats, recentPerformance, growthIndicators) {
    const insights = [];
    const subscriberCount = parseInt(stats?.subscriberCount || "0");
    const videoCount = parseInt(stats?.videoCount || "0");
    if (subscriberCount < 1e3) {
      insights.push("Growing channel - focus on consistency and niche content");
    } else if (subscriberCount < 1e4) {
      insights.push("Established audience - optimize for engagement and retention");
    } else if (subscriberCount < 1e5) {
      insights.push("Strong channel - diversify content and collaborate with others");
    } else {
      insights.push("Major channel - focus on brand partnerships and expansion");
    }
    if (recentPerformance && recentPerformance.avgEngagementRate < 2) {
      insights.push("low engagement");
    } else if (recentPerformance && recentPerformance.avgEngagementRate > 5) {
      insights.push("high audience engagement");
    }
    if (growthIndicators.contentFrequency === "Irregular") {
      insights.push("inconsistent posting");
    } else if (growthIndicators.contentFrequency === "Daily") {
      insights.push("high content frequency");
    }
    if (growthIndicators.viewToSubscriberRatio > 20) {
      insights.push("strong viral potential");
    }
    return insights;
  }
  /**
   * Analyze competitor data
   */
  analyzeCompetitors(competitors) {
    if (competitors.length === 0) {
      return { summary: "No competitors found for analysis" };
    }
    const totalSubs = competitors.reduce((sum, comp) => sum + comp.subscriberCount, 0);
    const avgSubs = Math.round(totalSubs / competitors.length);
    const topCompetitor = competitors[0];
    return {
      summary: `Found ${competitors.length} similar channels`,
      averageSubscribers: avgSubs,
      topCompetitor: {
        title: topCompetitor.title,
        subscribers: topCompetitor.subscriberCount
      },
      competitionLevel: avgSubs > 1e5 ? "High" : avgSubs > 1e4 ? "Medium" : "Low"
    };
  }
  /**
   * Register built-in tools
   */
  async registerBuiltInTools() {
    const builtInTools = [
      {
        name: "getVideoTranscript",
        description: "Extract transcript from a YouTube video URL or video ID",
        inputSchema: {
          type: "object",
          properties: {
            videoUrl: {
              type: "string",
              description: "YouTube video URL or direct video ID (supports youtube.com/watch, youtu.be, and direct video IDs)",
              minLength: 11
            },
            language: {
              type: "string",
              description: "Preferred language code (optional, defaults to English)",
              default: "en",
              pattern: "^[a-z]{2}(-[A-Z]{2})?$"
            }
          },
          required: ["videoUrl"],
          additionalProperties: false
        },
        handler: /* @__PURE__ */ __name(async (input, context) => {
          try {
            const { YouTubeService: YouTubeService2 } = await Promise.resolve().then(() => (init_youtube_service(), youtube_service_exports));
            const { ConfigurationService: ConfigurationService2 } = await Promise.resolve().then(() => (init_configuration_service(), configuration_service_exports));
            const { LoggerUtil: LoggerUtil2 } = await Promise.resolve().then(() => (init_logger_util(), logger_util_exports));
            const validatedInput = input;
            const env = context.env;
            if (!env) {
              throw new Error("Environment not available in execution context");
            }
            const config = new ConfigurationService2(env);
            await config.initialize();
            const logger2 = new LoggerUtil2(config.getConfiguration());
            const youtubeService = new YouTubeService2(config, logger2, env);
            const transcript = await youtubeService.getVideoTranscript(
              validatedInput.videoUrl,
              validatedInput.language || "en"
            );
            const response = {
              videoId: transcript.videoId,
              title: `Video transcript for ${transcript.videoId}`,
              language: transcript.language,
              isAutoGenerated: transcript.isAutoGenerated,
              transcript: {
                fullText: transcript.fullText,
                segments: transcript.segments,
                wordCount: transcript.wordCount,
                estimatedReadingTime: transcript.estimatedReadingTime
              }
            };
            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }],
              isError: false
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
              content: [{
                type: "text",
                text: `Error extracting transcript: ${errorMessage}`
              }],
              isError: true
            };
          }
        }, "handler")
      },
      {
        name: "getVideoAnalytics",
        description: "Get comprehensive analytics and statistics for a YouTube video",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "YouTube video URL (any format) or video ID",
              minLength: 11
            },
            includeChannel: {
              type: "boolean",
              description: "Include detailed channel analytics",
              default: true
            },
            includeEngagement: {
              type: "boolean",
              description: "Calculate engagement metrics and ratios",
              default: true
            }
          },
          required: ["url"],
          additionalProperties: false
        },
        handler: /* @__PURE__ */ __name(async (input, context) => {
          try {
            const { YouTubeService: YouTubeService2 } = await Promise.resolve().then(() => (init_youtube_service(), youtube_service_exports));
            const { ConfigurationService: ConfigurationService2 } = await Promise.resolve().then(() => (init_configuration_service(), configuration_service_exports));
            const { LoggerUtil: LoggerUtil2 } = await Promise.resolve().then(() => (init_logger_util(), logger_util_exports));
            const validatedInput = input;
            const env = context.env;
            if (!env) {
              throw new Error("Environment not available in execution context");
            }
            const config = new ConfigurationService2(env);
            await config.initialize();
            const logger2 = new LoggerUtil2(config.getConfiguration());
            const youtubeService = new YouTubeService2(config, logger2, env);
            const videoId = YouTubeService2.extractVideoId(validatedInput.url);
            if (!videoId) {
              throw new Error(`Invalid YouTube URL or video ID: ${validatedInput.url}`);
            }
            if (!YouTubeService2.isValidVideoId(videoId)) {
              throw new Error(`Invalid video ID format: ${videoId}`);
            }
            const videoInfo = await youtubeService.getVideoInfo(videoId);
            const metrics = await youtubeService.getVideoMetrics(videoId);
            let channelInfo = null;
            if (validatedInput.includeChannel !== false) {
              try {
                const channelResponse = await youtubeService.makeAPIRequest("channels", {
                  part: "snippet,statistics",
                  id: videoInfo.channelId
                });
                if (channelResponse.items && channelResponse.items.length > 0) {
                  const channel = channelResponse.items[0];
                  channelInfo = {
                    id: channel.id,
                    title: channel.snippet.title,
                    customUrl: channel.snippet.customUrl,
                    publishedAt: channel.snippet.publishedAt,
                    subscriberCount: parseInt(channel.statistics?.subscriberCount || "0"),
                    videoCount: parseInt(channel.statistics?.videoCount || "0"),
                    viewCount: parseInt(channel.statistics?.viewCount || "0")
                  };
                }
              } catch (error) {
                logger2.warn("Failed to get channel information", {
                  channelId: videoInfo.channelId,
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }
            let analytics = {};
            if (validatedInput.includeEngagement !== false) {
              const publishDate = new Date(metrics.publishedAt);
              const now = /* @__PURE__ */ new Date();
              const daysFromUpload = Math.floor((now.getTime() - publishDate.getTime()) / (1e3 * 60 * 60 * 24));
              const engagementRate = metrics.viewCount > 0 ? (metrics.likeCount + metrics.commentCount) / metrics.viewCount * 100 : 0;
              const likeToViewRatio = metrics.viewCount > 0 ? metrics.likeCount / metrics.viewCount * 100 : 0;
              const commentToViewRatio = metrics.viewCount > 0 ? metrics.commentCount / metrics.viewCount * 100 : 0;
              const averageViewsPerDay = daysFromUpload > 0 ? metrics.viewCount / daysFromUpload : metrics.viewCount;
              let performanceCategory = "low";
              if (engagementRate > 10) performanceCategory = "viral";
              else if (engagementRate > 5) performanceCategory = "high";
              else if (engagementRate > 2) performanceCategory = "average";
              analytics = {
                engagementRate: Math.round(engagementRate * 100) / 100,
                likeToViewRatio: Math.round(likeToViewRatio * 100) / 100,
                commentToViewRatio: Math.round(commentToViewRatio * 100) / 100,
                averageViewsPerDay: Math.round(averageViewsPerDay),
                performanceCategory,
                daysFromUpload
              };
            }
            const parseDuration = /* @__PURE__ */ __name((duration) => {
              const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
              if (!match) return duration;
              const hours = parseInt(match[1] || "0");
              const minutes = parseInt(match[2] || "0");
              const seconds = parseInt(match[3] || "0");
              if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
              }
              return `${minutes}:${seconds.toString().padStart(2, "0")}`;
            }, "parseDuration");
            let quotaCost = 1;
            if (channelInfo) quotaCost += 1;
            const response = {
              video: {
                id: videoInfo.videoId,
                title: videoInfo.title,
                description: videoInfo.description.substring(0, 500) + (videoInfo.description.length > 500 ? "..." : ""),
                publishedAt: metrics.publishedAt,
                duration: parseDuration(videoInfo.contentDetails.duration),
                categoryId: videoInfo.categoryId,
                defaultLanguage: videoInfo.defaultLanguage,
                tags: videoInfo.tags.slice(0, 10)
                // Limit tags for readability
              },
              statistics: {
                viewCount: metrics.viewCount,
                likeCount: metrics.likeCount,
                commentCount: metrics.commentCount,
                favoriteCount: metrics.favoriteCount,
                ...metrics.dislikeCount !== void 0 && { dislikeCount: metrics.dislikeCount }
              },
              ...channelInfo && {
                channel: channelInfo
              },
              ...Object.keys(analytics).length > 0 && {
                analytics
              },
              metadata: {
                retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
                cached: false,
                // This will be updated by caching logic
                quota_cost: quotaCost
              }
            };
            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }],
              isError: false
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
              content: [{
                type: "text",
                text: `Error getting video analytics: ${errorMessage}`
              }],
              isError: true
            };
          }
        }, "handler")
      },
      {
        name: "analyzeChannelPerformance",
        description: "Analyze channel performance and find top-performing videos with detailed insights",
        inputSchema: {
          type: "object",
          properties: {
            channelId: {
              type: "string",
              description: "YouTube channel ID (format: UC...)",
              pattern: "^UC[a-zA-Z0-9_-]{22}$"
            },
            videoCount: {
              type: "number",
              description: "Number of recent videos to analyze",
              minimum: 1,
              maximum: 50,
              default: 10
            },
            includeAnalytics: {
              type: "boolean",
              description: "Include detailed performance analytics",
              default: true
            }
          },
          required: ["channelId"],
          additionalProperties: false
        },
        handler: /* @__PURE__ */ __name(async (input, context) => {
          try {
            const { YouTubeService: YouTubeService2 } = await Promise.resolve().then(() => (init_youtube_service(), youtube_service_exports));
            const { ConfigurationService: ConfigurationService2 } = await Promise.resolve().then(() => (init_configuration_service(), configuration_service_exports));
            const { LoggerUtil: LoggerUtil2 } = await Promise.resolve().then(() => (init_logger_util(), logger_util_exports));
            const validatedInput = input;
            const env = context.env;
            if (!env) {
              throw new Error("Environment not available in execution context");
            }
            const config = new ConfigurationService2(env);
            await config.initialize();
            const logger2 = new LoggerUtil2(config.getConfiguration());
            const youtubeService = new YouTubeService2(config, logger2, env);
            const channelId = validatedInput.channelId;
            const videoCount = validatedInput.videoCount || 10;
            const includeAnalytics = validatedInput.includeAnalytics !== false;
            const channelResponse = await youtubeService.makeAPIRequest("channels", {
              part: "snippet,statistics,brandingSettings",
              id: channelId
            });
            if (!channelResponse.items || channelResponse.items.length === 0) {
              throw new Error(`Channel not found: ${channelId}`);
            }
            const channelData = channelResponse.items[0];
            const channelInfo = {
              id: channelData.id,
              title: channelData.snippet.title,
              description: channelData.snippet.description.substring(0, 300) + (channelData.snippet.description.length > 300 ? "..." : ""),
              customUrl: channelData.snippet.customUrl,
              publishedAt: channelData.snippet.publishedAt,
              country: channelData.snippet.country,
              subscriberCount: parseInt(channelData.statistics?.subscriberCount || "0"),
              videoCount: parseInt(channelData.statistics?.videoCount || "0"),
              viewCount: parseInt(channelData.statistics?.viewCount || "0"),
              hiddenSubscriberCount: channelData.statistics?.hiddenSubscriberCount || false
            };
            const searchResponse = await youtubeService.makeAPIRequest("search", {
              part: "id,snippet",
              channelId,
              type: "video",
              order: "date",
              maxResults: videoCount.toString()
            });
            if (!searchResponse.items || searchResponse.items.length === 0) {
              throw new Error(`No videos found for channel: ${channelId}`);
            }
            const videoIds = searchResponse.items.map((item) => item.id.videoId);
            const videosResponse = await youtubeService.makeAPIRequest("videos", {
              part: "snippet,statistics,contentDetails",
              id: videoIds.join(",")
            });
            const videos = [];
            let totalViews = 0;
            let totalLikes = 0;
            let totalComments = 0;
            let highestPerformer = { video: null, score: 0 };
            for (const video of videosResponse.items || []) {
              const stats = video.statistics;
              const viewCount = parseInt(stats?.viewCount || "0");
              const likeCount = parseInt(stats?.likeCount || "0");
              const commentCount = parseInt(stats?.commentCount || "0");
              const engagementScore = viewCount > 0 ? (likeCount + commentCount) / viewCount * 100 : 0;
              const performanceScore = viewCount * 0.6 + likeCount * 0.25 + commentCount * 0.15;
              if (performanceScore > highestPerformer.score) {
                highestPerformer = { video, score: performanceScore };
              }
              totalViews += viewCount;
              totalLikes += likeCount;
              totalComments += commentCount;
              const parseDuration = /* @__PURE__ */ __name((duration) => {
                const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (!match) return duration;
                const hours = parseInt(match[1] || "0");
                const minutes = parseInt(match[2] || "0");
                const seconds = parseInt(match[3] || "0");
                if (hours > 0) {
                  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
                }
                return `${minutes}:${seconds.toString().padStart(2, "0")}`;
              }, "parseDuration");
              videos.push({
                id: video.id,
                title: video.snippet.title,
                publishedAt: video.snippet.publishedAt,
                duration: parseDuration(video.contentDetails?.duration || "PT0S"),
                viewCount,
                likeCount,
                commentCount,
                favoriteCount: parseInt(stats?.favoriteCount || "0"),
                engagementScore: Math.round(engagementScore * 100) / 100,
                performanceScore: Math.round(performanceScore)
              });
            }
            videos.sort((a, b) => b.performanceScore - a.performanceScore);
            let analytics = {};
            if (includeAnalytics) {
              const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
              const avgLikes = videos.length > 0 ? Math.round(totalLikes / videos.length) : 0;
              const avgComments = videos.length > 0 ? Math.round(totalComments / videos.length) : 0;
              const avgEngagement = videos.length > 0 ? videos.reduce((sum, v) => sum + v.engagementScore, 0) / videos.length : 0;
              const subscriberToViewRatio = channelInfo.subscriberCount > 0 ? avgViews / channelInfo.subscriberCount : 0;
              let performanceCategory = "needs_improvement";
              if (avgEngagement > 5) performanceCategory = "excellent";
              else if (avgEngagement > 3) performanceCategory = "good";
              else if (avgEngagement > 1) performanceCategory = "average";
              analytics = {
                averageMetrics: {
                  views: avgViews,
                  likes: avgLikes,
                  comments: avgComments,
                  engagementRate: Math.round(avgEngagement * 100) / 100
                },
                performanceInsights: {
                  category: performanceCategory,
                  subscriberToViewRatio: Math.round(subscriberToViewRatio * 1e4) / 1e4,
                  totalEngagement: totalLikes + totalComments,
                  consistencyScore: this.calculateConsistencyScore(videos)
                },
                topPerformingVideo: highestPerformer.video ? {
                  id: highestPerformer.video.id,
                  title: highestPerformer.video.snippet.title,
                  viewCount: parseInt(highestPerformer.video.statistics?.viewCount || "0"),
                  performanceScore: Math.round(highestPerformer.score)
                } : null
              };
            }
            let quotaCost = 1;
            quotaCost += 100;
            quotaCost += 1;
            const response = {
              channel: channelInfo,
              videos,
              summary: {
                analyzedVideoCount: videos.length,
                totalViews,
                totalLikes,
                totalComments,
                averageViewsPerVideo: videos.length > 0 ? Math.round(totalViews / videos.length) : 0
              },
              ...Object.keys(analytics).length > 0 && { analytics },
              metadata: {
                analyzedAt: (/* @__PURE__ */ new Date()).toISOString(),
                quotaCost,
                videoRange: `Last ${videos.length} videos`
              }
            };
            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }],
              isError: false
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
              content: [{
                type: "text",
                text: `Error analyzing channel performance: ${errorMessage}`
              }],
              isError: true
            };
          }
        }, "handler")
      },
      {
        name: "compareWithCompetitors",
        description: "Compare multiple channels for comprehensive competitive analysis",
        inputSchema: {
          type: "object",
          properties: {
            channels: {
              type: "array",
              items: {
                type: "string",
                pattern: "^UC[a-zA-Z0-9_-]{22}$"
              },
              description: "Array of YouTube channel IDs to compare (2-5 channels)",
              minItems: 2,
              maxItems: 5
            },
            videoSampleSize: {
              type: "number",
              description: "Number of recent videos to analyze per channel",
              minimum: 5,
              maximum: 20,
              default: 10
            },
            includeEngagementAnalysis: {
              type: "boolean",
              description: "Include detailed engagement metrics comparison",
              default: true
            }
          },
          required: ["channels"],
          additionalProperties: false
        },
        handler: /* @__PURE__ */ __name(async (input, context) => {
          try {
            const { YouTubeService: YouTubeService2 } = await Promise.resolve().then(() => (init_youtube_service(), youtube_service_exports));
            const { ConfigurationService: ConfigurationService2 } = await Promise.resolve().then(() => (init_configuration_service(), configuration_service_exports));
            const { LoggerUtil: LoggerUtil2 } = await Promise.resolve().then(() => (init_logger_util(), logger_util_exports));
            const validatedInput = input;
            const env = context.env;
            if (!env) {
              throw new Error("Environment not available in execution context");
            }
            const config = new ConfigurationService2(env);
            await config.initialize();
            const logger2 = new LoggerUtil2(config.getConfiguration());
            const youtubeService = new YouTubeService2(config, logger2, env);
            const channelIds = validatedInput.channels;
            const videoSampleSize = validatedInput.videoSampleSize || 10;
            const includeEngagement = validatedInput.includeEngagementAnalysis !== false;
            const channelAnalyses = [];
            let totalQuotaCost = 0;
            for (const channelId of channelIds) {
              try {
                const channelResponse = await youtubeService.makeAPIRequest("channels", {
                  part: "snippet,statistics",
                  id: channelId
                });
                if (!channelResponse.items || channelResponse.items.length === 0) {
                  logger2.warn(`Channel not found: ${channelId}`);
                  continue;
                }
                const channelData = channelResponse.items[0];
                totalQuotaCost += 1;
                const searchResponse = await youtubeService.makeAPIRequest("search", {
                  part: "id,snippet",
                  channelId,
                  type: "video",
                  order: "date",
                  maxResults: videoSampleSize.toString()
                });
                totalQuotaCost += 100;
                if (!searchResponse.items || searchResponse.items.length === 0) {
                  logger2.warn(`No videos found for channel: ${channelId}`);
                  continue;
                }
                const videoIds = searchResponse.items.map((item) => item.id.videoId);
                const videosResponse = await youtubeService.makeAPIRequest("videos", {
                  part: "snippet,statistics,contentDetails",
                  id: videoIds.join(",")
                });
                totalQuotaCost += 1;
                let totalViews = 0;
                let totalLikes = 0;
                let totalComments = 0;
                let totalDuration = 0;
                const videoMetrics = [];
                for (const video of videosResponse.items || []) {
                  const stats = video.statistics;
                  const viewCount = parseInt(stats?.viewCount || "0");
                  const likeCount = parseInt(stats?.likeCount || "0");
                  const commentCount = parseInt(stats?.commentCount || "0");
                  const duration = this.parseDurationToSeconds(video.contentDetails?.duration || "PT0S");
                  totalViews += viewCount;
                  totalLikes += likeCount;
                  totalComments += commentCount;
                  totalDuration += duration;
                  const engagementScore = viewCount > 0 ? (likeCount + commentCount) / viewCount * 100 : 0;
                  videoMetrics.push({
                    viewCount,
                    likeCount,
                    commentCount,
                    duration,
                    engagementScore: Math.round(engagementScore * 1e4) / 1e4
                  });
                }
                const videoCount = videoMetrics.length;
                const avgViews = videoCount > 0 ? totalViews / videoCount : 0;
                const avgLikes = videoCount > 0 ? totalLikes / videoCount : 0;
                const avgComments = videoCount > 0 ? totalComments / videoCount : 0;
                const avgDuration = videoCount > 0 ? totalDuration / videoCount : 0;
                const avgEngagement = videoCount > 0 ? videoMetrics.reduce((sum, v) => sum + v.engagementScore, 0) / videoCount : 0;
                const subscriberCount = parseInt(channelData.statistics?.subscriberCount || "0");
                const subscriberEngagementRate = subscriberCount > 0 ? avgViews / subscriberCount * 100 : 0;
                const oldestVideo = searchResponse.items[searchResponse.items.length - 1];
                const newestVideo = searchResponse.items[0];
                const timeSpan = new Date(newestVideo.snippet.publishedAt).getTime() - new Date(oldestVideo.snippet.publishedAt).getTime();
                const weeksSpan = timeSpan / (1e3 * 60 * 60 * 24 * 7);
                const videosPerWeek = weeksSpan > 0 ? videoCount / weeksSpan : 0;
                channelAnalyses.push({
                  channel: {
                    id: channelData.id,
                    title: channelData.snippet.title,
                    description: channelData.snippet.description.substring(0, 200) + (channelData.snippet.description.length > 200 ? "..." : ""),
                    customUrl: channelData.snippet.customUrl,
                    subscriberCount,
                    totalVideoCount: parseInt(channelData.statistics?.videoCount || "0"),
                    totalViewCount: parseInt(channelData.statistics?.viewCount || "0")
                  },
                  performance: {
                    analyzedVideos: videoCount,
                    averageViews: Math.round(avgViews),
                    averageLikes: Math.round(avgLikes),
                    averageComments: Math.round(avgComments),
                    averageDurationSeconds: Math.round(avgDuration),
                    averageEngagementRate: Math.round(avgEngagement * 1e4) / 1e4,
                    subscriberEngagementRate: Math.round(subscriberEngagementRate * 100) / 100,
                    videosPerWeek: Math.round(videosPerWeek * 100) / 100
                  },
                  strengths: this.identifyChannelStrengths(avgViews, avgEngagement, subscriberEngagementRate, videosPerWeek),
                  ...includeEngagement && {
                    engagementAnalysis: {
                      consistency: this.calculateConsistencyScore(videoMetrics.map((v) => ({ performanceScore: v.viewCount }))),
                      topPerformingVideoViews: Math.max(...videoMetrics.map((v) => v.viewCount)),
                      engagementDistribution: this.analyzeEngagementDistribution(videoMetrics)
                    }
                  }
                });
              } catch (error) {
                logger2.error(`Failed to analyze channel ${channelId}`, {
                  error: error instanceof Error ? error.message : String(error)
                });
                channelAnalyses.push({
                  channel: { id: channelId, error: "Analysis failed" },
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }
            const comparison = this.performCompetitiveComparison(channelAnalyses);
            const response = {
              comparison: {
                channelCount: channelAnalyses.length,
                leader: comparison.leader,
                rankings: comparison.rankings,
                insights: comparison.insights
              },
              channels: channelAnalyses,
              metadata: {
                analyzedAt: (/* @__PURE__ */ new Date()).toISOString(),
                videoSampleSize,
                includeEngagementAnalysis: includeEngagement,
                quotaCost: totalQuotaCost
              }
            };
            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }],
              isError: false
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
              content: [{
                type: "text",
                text: `Error performing competitive analysis: ${errorMessage}`
              }],
              isError: true
            };
          }
        }, "handler")
      },
      {
        name: "searchContentByKeywords",
        description: "Search for videos containing specific keywords in titles, descriptions, and available transcripts",
        inputSchema: {
          type: "object",
          properties: {
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "Keywords to search for in video content",
              minItems: 1,
              maxItems: 10
            },
            channelId: {
              type: "string",
              description: "Channel ID to search within (optional)",
              pattern: "^UC[a-zA-Z0-9_-]{22}$"
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results to return",
              minimum: 1,
              maximum: 50,
              default: 20
            },
            publishedAfter: {
              type: "string",
              description: "Search for videos published after this date (RFC 3339 format)",
              pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$"
            },
            order: {
              type: "string",
              description: "Sort order for results",
              enum: ["relevance", "date", "viewCount", "rating"],
              default: "relevance"
            }
          },
          required: ["keywords"],
          additionalProperties: false
        },
        handler: /* @__PURE__ */ __name(async (input, context) => {
          try {
            const { YouTubeService: YouTubeService2 } = await Promise.resolve().then(() => (init_youtube_service(), youtube_service_exports));
            const { ConfigurationService: ConfigurationService2 } = await Promise.resolve().then(() => (init_configuration_service(), configuration_service_exports));
            const { LoggerUtil: LoggerUtil2 } = await Promise.resolve().then(() => (init_logger_util(), logger_util_exports));
            const validatedInput = input;
            const env = context.env;
            if (!env) {
              throw new Error("Environment not available in execution context");
            }
            const config = new ConfigurationService2(env);
            await config.initialize();
            const logger2 = new LoggerUtil2(config.getConfiguration());
            const youtubeService = new YouTubeService2(config, logger2, env);
            const keywords = validatedInput.keywords;
            const channelId = validatedInput.channelId;
            const maxResults = validatedInput.maxResults || 20;
            const publishedAfter = validatedInput.publishedAfter;
            const order = validatedInput.order || "relevance";
            const searchQuery = keywords.map((k) => `"${k}"`).join(" OR ");
            const searchParams = {
              part: "id,snippet",
              type: "video",
              q: searchQuery,
              maxResults: maxResults.toString(),
              order
            };
            if (channelId) {
              searchParams.channelId = channelId;
            }
            if (publishedAfter) {
              searchParams.publishedAfter = publishedAfter;
            }
            let quotaCost = 100;
            const searchResponse = await youtubeService.makeAPIRequest("search", searchParams);
            if (!searchResponse.items || searchResponse.items.length === 0) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    results: [],
                    summary: {
                      keywords,
                      totalResults: 0,
                      searchQuery,
                      message: "No videos found matching the search criteria"
                    },
                    metadata: {
                      searchedAt: (/* @__PURE__ */ new Date()).toISOString(),
                      quotaCost
                    }
                  }, null, 2)
                }],
                isError: false
              };
            }
            const videoIds = searchResponse.items.map((item) => item.id.videoId);
            const videosResponse = await youtubeService.makeAPIRequest("videos", {
              part: "snippet,statistics,contentDetails",
              id: videoIds.join(",")
            });
            quotaCost += 1;
            const results = [];
            const keywordStats = {};
            keywords.forEach((keyword) => {
              keywordStats[keyword.toLowerCase()] = { count: 0, videos: [] };
            });
            for (const video of videosResponse.items || []) {
              const snippet = video.snippet;
              const stats = video.statistics;
              const matches = this.analyzeKeywordMatches(
                keywords,
                snippet.title,
                snippet.description,
                snippet.tags || []
              );
              matches.foundKeywords.forEach((keyword) => {
                keywordStats[keyword.toLowerCase()].count++;
                keywordStats[keyword.toLowerCase()].videos.push(video.id);
              });
              const duration = this.parseDurationToSeconds(video.contentDetails?.duration || "PT0S");
              results.push({
                video: {
                  id: video.id,
                  title: snippet.title,
                  description: snippet.description.substring(0, 300) + (snippet.description.length > 300 ? "..." : ""),
                  publishedAt: snippet.publishedAt,
                  channelId: snippet.channelId,
                  channelTitle: snippet.channelTitle,
                  duration: this.formatSecondsToTime(duration),
                  thumbnails: {
                    default: snippet.thumbnails.default?.url,
                    medium: snippet.thumbnails.medium?.url,
                    high: snippet.thumbnails.high?.url
                  }
                },
                statistics: {
                  viewCount: parseInt(stats?.viewCount || "0"),
                  likeCount: parseInt(stats?.likeCount || "0"),
                  commentCount: parseInt(stats?.commentCount || "0")
                },
                keywordAnalysis: {
                  foundKeywords: matches.foundKeywords,
                  titleMatches: matches.titleMatches,
                  descriptionMatches: matches.descriptionMatches,
                  tagMatches: matches.tagMatches,
                  relevanceScore: matches.relevanceScore
                }
              });
            }
            results.sort((a, b) => b.keywordAnalysis.relevanceScore - a.keywordAnalysis.relevanceScore);
            const insights = this.generateKeywordSearchInsights(keywords, keywordStats, results);
            const response = {
              results,
              summary: {
                keywords,
                totalResults: results.length,
                searchQuery,
                topKeyword: insights.topKeyword,
                averageRelevanceScore: insights.averageRelevanceScore
              },
              keywordStatistics: keywordStats,
              insights: insights.recommendations,
              metadata: {
                searchedAt: (/* @__PURE__ */ new Date()).toISOString(),
                searchParameters: {
                  channelId,
                  maxResults,
                  publishedAfter,
                  order
                },
                quotaCost
              }
            };
            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }],
              isError: false
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
              content: [{
                type: "text",
                text: `Error searching for keywords: ${errorMessage}`
              }],
              isError: true
            };
          }
        }, "handler")
      },
      {
        name: "detectTrends",
        description: "Detect trending topics and keywords",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "YouTube category to analyze",
              enum: ["Gaming", "Music", "Technology", "Entertainment", "Education", "News"]
            },
            timeframe: {
              type: "string",
              description: "Time period for trend analysis",
              enum: ["24h", "7d", "30d"],
              default: "7d"
            },
            region: {
              type: "string",
              description: "Region code for localized trends",
              pattern: "^[A-Z]{2}$",
              default: "US"
            }
          },
          additionalProperties: false
        },
        handler: /* @__PURE__ */ __name(async (input, context) => {
          try {
            const { YouTubeService: YouTubeService2 } = await Promise.resolve().then(() => (init_youtube_service(), youtube_service_exports));
            const { ConfigurationService: ConfigurationService2 } = await Promise.resolve().then(() => (init_configuration_service(), configuration_service_exports));
            const { LoggerUtil: LoggerUtil2 } = await Promise.resolve().then(() => (init_logger_util(), logger_util_exports));
            const validatedInput = input;
            const env = context.env;
            if (!env) {
              throw new Error("Environment not available in execution context");
            }
            const config = new ConfigurationService2(env);
            await config.initialize();
            const logger2 = new LoggerUtil2(config.getConfiguration());
            const youtubeService = new YouTubeService2(config, logger2, env);
            const category = validatedInput.category;
            const timeframe = validatedInput.timeframe || "7d";
            const region = validatedInput.region || "US";
            const now = /* @__PURE__ */ new Date();
            const publishedAfter = /* @__PURE__ */ new Date();
            switch (timeframe) {
              case "24h":
                publishedAfter.setDate(now.getDate() - 1);
                break;
              case "7d":
                publishedAfter.setDate(now.getDate() - 7);
                break;
              case "30d":
                publishedAfter.setDate(now.getDate() - 30);
                break;
            }
            const trendQueries = [
              "trending",
              "viral",
              "popular",
              ...category ? [`${category.toLowerCase()}`] : []
            ];
            let quotaCost = 0;
            const trendData = [];
            const keywordFrequency = /* @__PURE__ */ new Map();
            for (const query of trendQueries.slice(0, 3)) {
              try {
                const searchParams = {
                  part: "id,snippet",
                  type: "video",
                  q: query,
                  maxResults: "25",
                  order: "relevance",
                  publishedAfter: publishedAfter.toISOString(),
                  regionCode: region
                };
                const searchResponse = await youtubeService.makeAPIRequest("search", searchParams);
                quotaCost += 100;
                if (searchResponse.items && searchResponse.items.length > 0) {
                  const videoIds = searchResponse.items.map((item) => item.id.videoId);
                  const videosResponse = await youtubeService.makeAPIRequest("videos", {
                    part: "snippet,statistics",
                    id: videoIds.join(",")
                  });
                  quotaCost += 1;
                  for (const video of videosResponse.items || []) {
                    const snippet = video.snippet;
                    const stats = video.statistics;
                    const text = `${snippet.title} ${snippet.description}`.toLowerCase();
                    const keywords = this.extractTopicsFromText(text);
                    keywords.forEach((keyword) => {
                      keywordFrequency.set(keyword, (keywordFrequency.get(keyword) || 0) + 1);
                    });
                    const viewCount = parseInt(stats?.viewCount || "0");
                    const likeCount = parseInt(stats?.likeCount || "0");
                    const commentCount = parseInt(stats?.commentCount || "0");
                    const engagementRate = viewCount > 0 ? (likeCount + commentCount) / viewCount * 100 : 0;
                    const publishedDate = new Date(snippet.publishedAt);
                    const daysSincePublished = Math.max(
                      1,
                      (now.getTime() - publishedDate.getTime()) / (1e3 * 60 * 60 * 24)
                    );
                    const trendScore = viewCount / 1e3 * engagementRate * (30 / daysSincePublished);
                    trendData.push({
                      query,
                      video: {
                        id: video.id,
                        title: snippet.title,
                        channelTitle: snippet.channelTitle,
                        publishedAt: snippet.publishedAt,
                        categoryId: snippet.categoryId
                      },
                      metrics: {
                        viewCount,
                        likeCount,
                        commentCount,
                        engagementRate: Math.round(engagementRate * 1e4) / 1e4,
                        daysSincePublished: Math.round(daysSincePublished * 10) / 10,
                        trendScore: Math.round(trendScore * 100) / 100
                      },
                      keywords
                    });
                  }
                }
              } catch (error) {
                logger2.warn(`Failed to search for query: ${query}`, {
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }
            const sortedTrends = trendData.sort((a, b) => b.metrics.trendScore - a.metrics.trendScore);
            const trendingKeywords = Array.from(keywordFrequency.entries()).sort(([, a], [, b]) => b - a).slice(0, 15).map(([keyword, frequency]) => ({ keyword, frequency }));
            const emergingTrends = trendingKeywords.filter((item) => item.frequency >= 3).slice(0, 8);
            const insights = this.generateTrendInsights(
              sortedTrends,
              trendingKeywords,
              category,
              timeframe
            );
            const response = {
              trends: {
                topTrendingVideos: sortedTrends.slice(0, 10),
                trendingKeywords: trendingKeywords.slice(0, 10),
                emergingTopics: emergingTrends,
                insights
              },
              analysis: {
                totalVideosAnalyzed: trendData.length,
                timeframe,
                region,
                category: category || "All categories",
                topTrendScore: sortedTrends.length > 0 ? sortedTrends[0].metrics.trendScore : 0,
                averageEngagementRate: trendData.length > 0 ? Math.round(trendData.reduce((sum, item) => sum + item.metrics.engagementRate, 0) / trendData.length * 1e4) / 1e4 : 0
              },
              recommendations: this.generateTrendRecommendations(trendingKeywords, emergingTrends, timeframe),
              metadata: {
                analyzedAt: (/* @__PURE__ */ new Date()).toISOString(),
                searchQueries: trendQueries.slice(0, 3),
                quotaCost
              }
            };
            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }],
              isError: false
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
              content: [{
                type: "text",
                text: `Error detecting trends: ${errorMessage}`
              }],
              isError: true
            };
          }
        }, "handler")
      },
      {
        name: "getChannelInsights",
        description: "Get comprehensive insights for a YouTube channel",
        inputSchema: {
          type: "object",
          properties: {
            channelId: {
              type: "string",
              description: "YouTube channel ID",
              pattern: "^UC[a-zA-Z0-9_-]{22}$"
            },
            includeCompetitors: {
              type: "boolean",
              description: "Include competitor analysis",
              default: false
            }
          },
          required: ["channelId"],
          additionalProperties: false
        },
        handler: /* @__PURE__ */ __name(async (input, context) => {
          try {
            const { YouTubeService: YouTubeService2 } = await Promise.resolve().then(() => (init_youtube_service(), youtube_service_exports));
            const { ConfigurationService: ConfigurationService2 } = await Promise.resolve().then(() => (init_configuration_service(), configuration_service_exports));
            const { LoggerUtil: LoggerUtil2 } = await Promise.resolve().then(() => (init_logger_util(), logger_util_exports));
            const validatedInput = input;
            const env = context.env;
            if (!env) {
              throw new Error("Environment not available in execution context");
            }
            const config = new ConfigurationService2(env);
            await config.initialize();
            const logger2 = new LoggerUtil2(config.getConfiguration());
            const youtubeService = new YouTubeService2(config, logger2, env);
            const channelId = validatedInput.channelId;
            const includeCompetitors = validatedInput.includeCompetitors || false;
            let quotaCost = 0;
            const channelResponse = await youtubeService.makeAPIRequest("channels", {
              part: "snippet,statistics,brandingSettings,contentDetails",
              id: channelId
            });
            quotaCost += 1;
            if (!channelResponse.items || channelResponse.items.length === 0) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    error: "Channel not found",
                    channelId,
                    suggestions: [
                      "Verify the channel ID is correct",
                      "Check if the channel is public",
                      "Ensure the channel exists"
                    ]
                  }, null, 2)
                }],
                isError: true
              };
            }
            const channel = channelResponse.items[0];
            const stats = channel.statistics;
            const snippet = channel.snippet;
            const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
            let recentVideos = [];
            if (uploadsPlaylistId) {
              try {
                const playlistResponse = await youtubeService.makeAPIRequest("playlistItems", {
                  part: "snippet",
                  playlistId: uploadsPlaylistId,
                  maxResults: "10"
                });
                quotaCost += 1;
                if (playlistResponse.items && playlistResponse.items.length > 0) {
                  const videoIds = playlistResponse.items.map((item) => item.snippet.resourceId.videoId);
                  const videosResponse = await youtubeService.makeAPIRequest("videos", {
                    part: "snippet,statistics,contentDetails",
                    id: videoIds.join(",")
                  });
                  quotaCost += 1;
                  recentVideos = videosResponse.items || [];
                }
              } catch (error) {
                logger2.warn("Failed to fetch recent videos", {
                  channelId,
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }
            const channelInsights = this.analyzeChannelPerformance(channel, recentVideos);
            let competitorAnalysis = null;
            if (includeCompetitors) {
              try {
                const searchQueries = this.generateCompetitorSearchQueries(snippet.title, snippet.description);
                competitorAnalysis = await this.findCompetitors(youtubeService, searchQueries.slice(0, 2), channelId);
                quotaCost += competitorAnalysis.quotaCost;
              } catch (error) {
                logger2.warn("Failed to analyze competitors", {
                  channelId,
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }
            const recommendations = this.generateChannelRecommendations(channelInsights, recentVideos, competitorAnalysis);
            const response = {
              channel: {
                id: channelId,
                title: snippet.title,
                description: snippet.description.substring(0, 500) + (snippet.description.length > 500 ? "..." : ""),
                customUrl: snippet.customUrl,
                publishedAt: snippet.publishedAt,
                country: snippet.country,
                thumbnails: {
                  high: snippet.thumbnails.high?.url
                },
                branding: {
                  bannerImageUrl: channel.brandingSettings?.image?.bannerExternalUrl,
                  keywords: channel.brandingSettings?.channel?.keywords
                }
              },
              statistics: {
                subscriberCount: parseInt(stats?.subscriberCount || "0"),
                viewCount: parseInt(stats?.viewCount || "0"),
                videoCount: parseInt(stats?.videoCount || "0"),
                hiddenSubscriberCount: stats?.hiddenSubscriberCount === "true"
              },
              insights: channelInsights,
              recentContent: {
                videos: recentVideos.slice(0, 5).map((video) => ({
                  id: video.id,
                  title: video.snippet.title,
                  publishedAt: video.snippet.publishedAt,
                  viewCount: parseInt(video.statistics?.viewCount || "0"),
                  likeCount: parseInt(video.statistics?.likeCount || "0"),
                  commentCount: parseInt(video.statistics?.commentCount || "0"),
                  duration: this.formatSecondsToTime(this.parseDurationToSeconds(video.contentDetails?.duration || "PT0S"))
                })),
                totalAnalyzed: recentVideos.length
              },
              ...competitorAnalysis && { competitorAnalysis },
              recommendations,
              metadata: {
                analyzedAt: (/* @__PURE__ */ new Date()).toISOString(),
                includeCompetitors,
                quotaCost
              }
            };
            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }],
              isError: false
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
              content: [{
                type: "text",
                text: `Error analyzing channel insights: ${errorMessage}`
              }],
              isError: true
            };
          }
        }, "handler")
      }
    ];
    for (const tool of builtInTools) {
      this.register(tool);
    }
  }
};
var ToolNotFoundError = class extends Error {
  static {
    __name(this, "ToolNotFoundError");
  }
  constructor(message) {
    super(message);
    this.name = "ToolNotFoundError";
  }
};
var ValidationError = class extends Error {
  static {
    __name(this, "ValidationError");
  }
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
};
var MCPToolError = class extends Error {
  static {
    __name(this, "MCPToolError");
  }
  code;
  constructor(code, message) {
    super(message);
    this.name = "MCPToolError";
    this.code = code;
  }
};

// src/remote-mcp-server.ts
var RemoteMCPServer = class {
  constructor(env) {
    this.env = env;
    this.configService = new ConfigurationService(env);
    this.logger = new LoggerUtil(this.configService.getConfiguration());
    this.errorHandler = new ErrorHandlerUtil(this.logger);
    this.toolRegistry = new ToolRegistryUtil(this.configService, this.logger);
    this.youTubeService = new YouTubeService(this.configService, this.logger, env);
    this.authService = new AuthenticationService(env, this.logger, this.errorHandler);
    this.connectionManager = new ConnectionManagementService(env, this.logger, this.errorHandler);
    this.wsTransport = new WebSocketTransportService(
      env,
      this.logger,
      this.errorHandler,
      this.authService,
      this.connectionManager
    );
  }
  static {
    __name(this, "RemoteMCPServer");
  }
  configService;
  logger;
  errorHandler;
  toolRegistry;
  // Core services
  youTubeService;
  // Remote MCP services
  authService;
  connectionManager;
  wsTransport;
  /**
   * Initialize the Remote MCP server
   */
  async initialize() {
    try {
      this.logger.info("Initializing Remote MCP Server");
      await this.registerPlaceholderTools();
      this.logger.info("Remote MCP Server initialized successfully", {
        toolsRegistered: this.toolRegistry.listTools().length,
        serverCapabilities: ["websocket", "authentication", "real-time", "multi-user"]
      });
    } catch (error) {
      this.logger.error("Failed to initialize Remote MCP Server", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  /**
   * Handle incoming HTTP requests
   */
  async handleRequest(context) {
    const { request, env, ctx } = context;
    const url = new URL(request.url);
    try {
      if (url.pathname === "/health") {
        return await this.handleHealthCheck();
      }
      if (url.pathname === "/ws" && request.headers.get("Upgrade") === "websocket") {
        return await this.wsTransport.handleUpgrade(request);
      }
      if (url.pathname.startsWith("/api/")) {
        return await this.handleApiRequest(request);
      }
      if (url.pathname === "/mcp" && request.method === "POST") {
        return await this.handleMCPRequest(request);
      }
      return new Response("Remote MCP Server - WebSocket endpoint available at /ws", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    } catch (error) {
      this.logger.error("Request handling failed", {
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return this.errorHandler.createErrorResponse(
        500,
        "Internal server error",
        "request-handling"
      );
    }
  }
  /**
   * Handle health check requests
   */
  async handleHealthCheck() {
    try {
      const health = await this.getServerHealth();
      const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
      return new Response(JSON.stringify(health), {
        status: statusCode,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return this.errorHandler.createErrorResponse(
        503,
        "Health check failed",
        "health-check"
      );
    }
  }
  /**
   * Handle HTTP API requests (REST-like interface)
   */
  async handleApiRequest(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts[1] === "tools") {
      if (request.method === "GET" && pathParts.length === 2) {
        const tools = this.toolRegistry.listTools();
        return new Response(JSON.stringify({ tools }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      if (request.method === "POST" && pathParts.length === 3) {
        const toolName = pathParts[2];
        const input = await request.json();
        const mockContext = {
          environment: "development",
          requestId: crypto.randomUUID()
        };
        try {
          const result = await this.toolRegistry.executeTool(toolName, input, mockContext);
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          return this.errorHandler.createErrorResponse(
            400,
            error instanceof Error ? error.message : "Tool execution failed",
            "tool-execution"
          );
        }
      }
    }
    return this.errorHandler.createErrorResponse(404, "API endpoint not found", "api-not-found");
  }
  /**
   * Handle standard MCP protocol requests over HTTP
   */
  async handleMCPRequest(request) {
    try {
      const mcpRequest = await request.json();
      switch (mcpRequest.method) {
        case "tools/list":
          const tools = this.toolRegistry.listTools();
          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id: mcpRequest.id,
            result: { tools }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        case "tools/call":
          const mockContext = {
            environment: "development",
            requestId: crypto.randomUUID()
          };
          const result = await this.toolRegistry.executeTool(
            mcpRequest.params.name,
            mcpRequest.params.arguments,
            mockContext
          );
          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id: mcpRequest.id,
            result
          }), {
            headers: { "Content-Type": "application/json" }
          });
        default:
          return this.errorHandler.createErrorResponse(
            400,
            `Unknown MCP method: ${mcpRequest.method}`,
            "unknown-method"
          );
      }
    } catch (error) {
      this.logger.error("MCP request handling failed", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return this.errorHandler.createErrorResponse(
        400,
        "Invalid MCP request",
        "invalid-mcp"
      );
    }
  }
  /**
   * Initialize built-in tools from ToolRegistry
   */
  async registerPlaceholderTools() {
    await this.toolRegistry.initialize();
    const registeredTools = this.toolRegistry.listTools();
    this.logger.info("Built-in tools registered successfully", {
      toolCount: registeredTools.length,
      toolNames: registeredTools.map((t) => t.name)
    });
  }
  /**
   * Get comprehensive server health status
   */
  async getServerHealth() {
    try {
      const connectionStats = this.connectionManager.getConnectionStats();
      const authStats = this.authService.getAuthStats();
      const wsStats = this.wsTransport.getConnectionStats();
      const services = {
        youtube: "online",
        // Would test YouTube API connectivity
        cache: "online",
        // Would test KV connectivity
        database: "online"
        // Would test persistent storage
      };
      let status = "healthy";
      if (connectionStats.activeConnections < connectionStats.totalConnections * 0.7) {
        status = "degraded";
      }
      return {
        status,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        metrics: {
          activeConnections: connectionStats.activeConnections,
          totalRequests: 0,
          // Would track this in production
          averageResponseTime: 0,
          // Would calculate from metrics
          errorRate: 0,
          // Would calculate from error tracking
          quotaUsage: authStats.totalQuotaUsed
        },
        services
      };
    } catch (error) {
      this.logger.error("Health check failed", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return {
        status: "unhealthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        metrics: {
          activeConnections: 0,
          totalRequests: 0,
          averageResponseTime: 0,
          errorRate: 100,
          quotaUsage: 0
        },
        services: {
          youtube: "offline",
          cache: "offline",
          database: "offline"
        }
      };
    }
  }
  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.logger.info("Shutting down Remote MCP Server");
    try {
      await this.wsTransport.closeAllConnections();
      await Promise.all([
        this.connectionManager.cleanup(),
        this.authService.cleanup()
      ]);
      this.logger.info("Remote MCP Server shutdown completed");
    } catch (error) {
      this.logger.error("Error during shutdown", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};

// src/index.ts
init_configuration_service();
init_logger_util();
var configService = null;
var logger = null;
var toolRegistry = null;
var errorHandler = null;
var remoteMCPServer = null;
async function initializeServices(env) {
  if (configService && logger && toolRegistry && errorHandler && remoteMCPServer) {
    return;
  }
  try {
    if (!configService) {
      configService = new ConfigurationService(env);
      await configService.initialize();
    }
    if (!logger) {
      logger = new LoggerUtil(configService.getConfiguration());
    }
    if (!errorHandler) {
      errorHandler = new ErrorHandlerUtil(logger);
    }
    if (!toolRegistry) {
      toolRegistry = new ToolRegistryUtil(configService, logger);
    }
    if (!remoteMCPServer) {
      remoteMCPServer = new RemoteMCPServer(env);
      await remoteMCPServer.initialize();
    }
    logger.info("All services initialized successfully");
  } catch (error) {
    console.error("Service initialization failed:", error);
    throw error;
  }
}
__name(initializeServices, "initializeServices");
async function fetch2(request, env, ctx) {
  try {
    await initializeServices(env);
    if (!configService || !logger || !toolRegistry || !errorHandler || !remoteMCPServer) {
      throw new Error("Failed to initialize services");
    }
    const context = {
      request,
      env,
      ctx
    };
    return await remoteMCPServer.handleRequest(context);
  } catch (error) {
    console.error("Worker error:", error);
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      },
      id: null
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
}
__name(fetch2, "fetch");
async function healthCheck(request, env, ctx) {
  try {
    await initializeServices(env);
    const health = {
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      services: {
        configuration: configService?.isInitialized() ?? false,
        logger: logger !== null,
        toolRegistry: toolRegistry !== null,
        errorHandler: errorHandler !== null,
        remoteMCPServer: remoteMCPServer !== null
      },
      environment: env.ENVIRONMENT,
      version: "0.3.0"
    };
    return new Response(JSON.stringify(health, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    const errorHealth = {
      status: "unhealthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      version: "0.3.0"
    };
    return new Response(JSON.stringify(errorHealth, null, 2), {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  }
}
__name(healthCheck, "healthCheck");
var src_default = {
  fetch: fetch2,
  healthCheck
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-9NTBqh/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-9NTBqh/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
