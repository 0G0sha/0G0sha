/**
 * gen-import.ts — AUTO-GENERATED, do not edit manually.
 * Regenerate: npx gen-import --globals
 *
 * Import once in your entry point: import './gen-import'
 * After that, all exports are available as globals — no per-file imports needed.
 */

export type { ILearnedWeight } from './Module/agent';
export type { UploadOptions } from './Providers/cloudinary.provider';
export type { TargetModel, PromptCategory, PromptComplexity, PromptElement, Token, PromptGap, AnalysisResult, TransformRule, LearnedWeight, SimilarPrompt, AgentInput, AgentOutput, ElementDetector } from './agent';

import { addJobToQueue as _addJobToQueue, queue as _queue } from './MessageQueue/Queue/queue.email';
import { sendEmail as _sendEmail, jobProcessor as _jobProcessor } from './MessageQueue/jobs/job.process.emails';
import { RegisterDTO as _RegisterDTO, LoginDTO as _LoginDTO } from './Module/Authentication/DTO/index.dto';
import { OauthService as _OauthService } from './Module/Authentication/Service/0Auth.service';
import { BasedAuthService as _BasedAuthService } from './Module/Authentication/Service/based-auth.service';
import { registerController as _registerController, refreshController as _refreshController, logoutController as _logoutController, loginController as _loginController, googleController as _googleController, forgetPasswordController as _forgetPasswordController, resetPasswordController as _resetPasswordController } from './Module/Authentication/auth.controller';
import { token_PASETO as _token_PASETO } from './Module/Authentication/utils/paseto.utils';
import { PublishNotificationDTO as _PublishNotificationDTO, GetNotificationsDTO as _GetNotificationsDTO } from './Module/Notifications/DTO/index.dto';
import { NotificationModel as _NotificationModel } from './Module/Notifications/Schema/notification.schema';
import { NotificationHistoryService as _NotificationHistoryService } from './Module/Notifications/Service/notification-history.service';
import { publishNotification as _publishNotification } from './Module/Notifications/Service/public.service';
import { registerClient as _registerClient, getActiveClients as _getActiveClients } from './Module/Notifications/Service/register.service';
import { formatSSEEvent as _formatSSEEvent, formatHeartbeat as _formatHeartbeat } from './Module/Notifications/Utils/sseFormat';
import { streamController as _streamController, publishController as _publishController, getNotificationsController as _getNotificationsController, markSeenController as _markSeenController, markAllSeenController as _markAllSeenController } from './Module/Notifications/notification.controller';
import { EditProfileDTO as _EditProfileDTO } from './Module/User/DTO/index.dto';
import { UserModel as _UserModel } from './Module/User/Schema/user.schema';
import { BasedUserService as _BasedUserService } from './Module/User/Service/based-user.service';
import { profileMiddleware as _profileMiddleware } from './Module/User/middleware';
import { editProfileController as _editProfileController, deleteAccountController as _deleteAccountController, profileController as _profileController } from './Module/User/user.controller';
import { AnalyzeDTO as _AnalyzeDTO } from './Module/agent/DTO/index.dto';
import { LearnedWeightModel as _LearnedWeightModel } from './Module/agent/Schema/learned.weight.schema';
import { AgentService as _AgentService } from './Module/agent/Service/based-agent.service';
import { analyzeController as _analyzeController } from './Module/agent/agent.controller';
import { PromptHistoryModel as _PromptHistoryModel } from './Module/prompt/Schema/prompt.schema';
import { TokenLedgerModel as _TokenLedgerModel } from './Module/subscription/Schema/TokenLedger.schema';
import { PaymentHistoryModel as _PaymentHistoryModel } from './Module/subscription/Schema/payment.history.schema';
import { PlanModel as _PlanModel } from './Module/subscription/Schema/plans.schema';
import { TemplateModel as _TemplateModel } from './Module/template/Schema/template.schema';
import { uploadToCloudinary as _uploadToCloudinary, upload as _upload } from './Providers/cloudinary.provider';
import { USER_PLAN as _USER_PLAN, TOKEN_LEDGER_ACTION as _TOKEN_LEDGER_ACTION, PLAN_PROVIDER as _PLAN_PROVIDER, PAYMENT_STATUS as _PAYMENT_STATUS, PAYMENT_METHOD as _PAYMENT_METHOD } from './Shared/enum';
import { AppError as _AppError } from './Shared/errors/app-error';
import { errorHandler as _errorHandler } from './Shared/errors/errorHandler';
import { CATEGORY_KEYWORDS as _CATEGORY_KEYWORDS, ACTION_KEYWORDS as _ACTION_KEYWORDS } from './agent/data/classifier.data';
import { ROLE_TEMPLATES as _ROLE_TEMPLATES, BASE_CONSTRAINTS as _BASE_CONSTRAINTS, CATEGORY_CONSTRAINTS as _CATEGORY_CONSTRAINTS, OUTPUT_FORMATS as _OUTPUT_FORMATS, MODEL_FORMAT_SUFFIX as _MODEL_FORMAT_SUFFIX, SPECIFICITY_MAP as _SPECIFICITY_MAP, QUALITY_MARKERS as _QUALITY_MARKERS, CONTEXT_TEMPLATES as _CONTEXT_TEMPLATES, TASK_STRUCTURE_TEMPLATES as _TASK_STRUCTURE_TEMPLATES, COMPLEXITY_MODIFIERS as _COMPLEXITY_MODIFIERS } from './agent/data/rules-template';
import { STOP_WORDS as _STOP_WORDS, ACTION_VERBS as _ACTION_VERBS, DOMAIN_KEYWORDS as _DOMAIN_KEYWORDS } from './agent/data/tokenizer.data';
import { classify as _classify, assessComplexity as _assessComplexity, extractIntent as _extractIntent } from './agent/script/classifier';
import { detect as _detect, calcRawScore as _calcRawScore } from './agent/script/gap-scorer';
import { wrapSection as _wrapSection } from './agent/script/modelAdapter';
import { addRules as _addRules } from './agent/script/rule-engine';
import { tokenize as _tokenize, extractKeywords as _extractKeywords } from './agent/script/tokenizer';
import { allowedOrigins as _allowedOrigins, default as _app_config } from './app.config';
import { default as _cloudinary } from './config/cloudinary';
import { default as _dotenv } from './config/dotenv';
import { mongoDBConfig as _mongoDBConfig, redisConfig as _redisConfig } from './config';
import { default as _redis } from './config/redis';
import { userMiddleware as _userMiddleware } from './middleware/user.middleware';
import { validateDTO as _validateDTO } from './middleware/validateDTO';
import { socketFunction as _socketFunction, getNotificationNamespace as _getNotificationNamespace } from './socket';
import { setupSwagger as _setupSwagger } from './swagger';
import { asyncHandler as _asyncHandler } from './utils/api-requesthandler';
import { hashText as _hashText } from './utils/hashText';
import { limiter as _limiter, authlimiter as _authlimiter } from './utils/limit-request';
import { logger as _logger, createLogger as _createLogger } from './utils/logger';
import { normalizePagination as _normalizePagination, paginate as _paginate } from './utils/pagination';
import { default as _auth_module } from './Module/Authentication/auth.module';
import { default as _notification_module } from './Module/Notifications/notification.module';
import { default as _user_module } from './Module/User/user.module';
import { default as _agent_module } from './Module/agent/agent.module';
import { default as _app_module } from './app.module';

export { _addJobToQueue as addJobToQueue, _queue as queue, _sendEmail as sendEmail, _jobProcessor as jobProcessor, _RegisterDTO as RegisterDTO, _LoginDTO as LoginDTO, _OauthService as OauthService, _BasedAuthService as BasedAuthService, _registerController as registerController, _refreshController as refreshController, _logoutController as logoutController, _loginController as loginController, _googleController as googleController, _forgetPasswordController as forgetPasswordController, _resetPasswordController as resetPasswordController, _token_PASETO as token_PASETO, _PublishNotificationDTO as PublishNotificationDTO, _GetNotificationsDTO as GetNotificationsDTO, _NotificationModel as NotificationModel, _NotificationHistoryService as NotificationHistoryService, _publishNotification as publishNotification, _registerClient as registerClient, _getActiveClients as getActiveClients, _formatSSEEvent as formatSSEEvent, _formatHeartbeat as formatHeartbeat, _streamController as streamController, _publishController as publishController, _getNotificationsController as getNotificationsController, _markSeenController as markSeenController, _markAllSeenController as markAllSeenController, _EditProfileDTO as EditProfileDTO, _UserModel as UserModel, _BasedUserService as BasedUserService, _profileMiddleware as profileMiddleware, _editProfileController as editProfileController, _deleteAccountController as deleteAccountController, _profileController as profileController, _AnalyzeDTO as AnalyzeDTO, _LearnedWeightModel as LearnedWeightModel, _AgentService as AgentService, _analyzeController as analyzeController, _PromptHistoryModel as PromptHistoryModel, _TokenLedgerModel as TokenLedgerModel, _PaymentHistoryModel as PaymentHistoryModel, _PlanModel as PlanModel, _TemplateModel as TemplateModel, _uploadToCloudinary as uploadToCloudinary, _upload as upload, _USER_PLAN as USER_PLAN, _TOKEN_LEDGER_ACTION as TOKEN_LEDGER_ACTION, _PLAN_PROVIDER as PLAN_PROVIDER, _PAYMENT_STATUS as PAYMENT_STATUS, _PAYMENT_METHOD as PAYMENT_METHOD, _AppError as AppError, _errorHandler as errorHandler, _CATEGORY_KEYWORDS as CATEGORY_KEYWORDS, _ACTION_KEYWORDS as ACTION_KEYWORDS, _ROLE_TEMPLATES as ROLE_TEMPLATES, _BASE_CONSTRAINTS as BASE_CONSTRAINTS, _CATEGORY_CONSTRAINTS as CATEGORY_CONSTRAINTS, _OUTPUT_FORMATS as OUTPUT_FORMATS, _MODEL_FORMAT_SUFFIX as MODEL_FORMAT_SUFFIX, _SPECIFICITY_MAP as SPECIFICITY_MAP, _QUALITY_MARKERS as QUALITY_MARKERS, _CONTEXT_TEMPLATES as CONTEXT_TEMPLATES, _TASK_STRUCTURE_TEMPLATES as TASK_STRUCTURE_TEMPLATES, _COMPLEXITY_MODIFIERS as COMPLEXITY_MODIFIERS, _STOP_WORDS as STOP_WORDS, _ACTION_VERBS as ACTION_VERBS, _DOMAIN_KEYWORDS as DOMAIN_KEYWORDS, _classify as classify, _assessComplexity as assessComplexity, _extractIntent as extractIntent, _detect as detect, _calcRawScore as calcRawScore, _wrapSection as wrapSection, _addRules as addRules, _tokenize as tokenize, _extractKeywords as extractKeywords, _allowedOrigins as allowedOrigins, _app_config as app_config, _cloudinary as cloudinary, _dotenv as dotenv, _mongoDBConfig as mongoDBConfig, _redisConfig as redisConfig, _redis as redis, _userMiddleware as userMiddleware, _validateDTO as validateDTO, _socketFunction as socketFunction, _getNotificationNamespace as getNotificationNamespace, _setupSwagger as setupSwagger, _asyncHandler as asyncHandler, _hashText as hashText, _limiter as limiter, _authlimiter as authlimiter, _logger as logger, _createLogger as createLogger, _normalizePagination as normalizePagination, _paginate as paginate, _auth_module as auth_module, _notification_module as notification_module, _user_module as user_module, _agent_module as agent_module, _app_module as app_module };

Object.assign(global as any, { addJobToQueue: _addJobToQueue, queue: _queue, sendEmail: _sendEmail, jobProcessor: _jobProcessor, RegisterDTO: _RegisterDTO, LoginDTO: _LoginDTO, OauthService: _OauthService, BasedAuthService: _BasedAuthService, registerController: _registerController, refreshController: _refreshController, logoutController: _logoutController, loginController: _loginController, googleController: _googleController, forgetPasswordController: _forgetPasswordController, resetPasswordController: _resetPasswordController, token_PASETO: _token_PASETO, PublishNotificationDTO: _PublishNotificationDTO, GetNotificationsDTO: _GetNotificationsDTO, NotificationModel: _NotificationModel, NotificationHistoryService: _NotificationHistoryService, publishNotification: _publishNotification, registerClient: _registerClient, getActiveClients: _getActiveClients, formatSSEEvent: _formatSSEEvent, formatHeartbeat: _formatHeartbeat, streamController: _streamController, publishController: _publishController, getNotificationsController: _getNotificationsController, markSeenController: _markSeenController, markAllSeenController: _markAllSeenController, EditProfileDTO: _EditProfileDTO, UserModel: _UserModel, BasedUserService: _BasedUserService, profileMiddleware: _profileMiddleware, editProfileController: _editProfileController, deleteAccountController: _deleteAccountController, profileController: _profileController, AnalyzeDTO: _AnalyzeDTO, LearnedWeightModel: _LearnedWeightModel, AgentService: _AgentService, analyzeController: _analyzeController, PromptHistoryModel: _PromptHistoryModel, TokenLedgerModel: _TokenLedgerModel, PaymentHistoryModel: _PaymentHistoryModel, PlanModel: _PlanModel, TemplateModel: _TemplateModel, uploadToCloudinary: _uploadToCloudinary, upload: _upload, USER_PLAN: _USER_PLAN, TOKEN_LEDGER_ACTION: _TOKEN_LEDGER_ACTION, PLAN_PROVIDER: _PLAN_PROVIDER, PAYMENT_STATUS: _PAYMENT_STATUS, PAYMENT_METHOD: _PAYMENT_METHOD, AppError: _AppError, errorHandler: _errorHandler, CATEGORY_KEYWORDS: _CATEGORY_KEYWORDS, ACTION_KEYWORDS: _ACTION_KEYWORDS, ROLE_TEMPLATES: _ROLE_TEMPLATES, BASE_CONSTRAINTS: _BASE_CONSTRAINTS, CATEGORY_CONSTRAINTS: _CATEGORY_CONSTRAINTS, OUTPUT_FORMATS: _OUTPUT_FORMATS, MODEL_FORMAT_SUFFIX: _MODEL_FORMAT_SUFFIX, SPECIFICITY_MAP: _SPECIFICITY_MAP, QUALITY_MARKERS: _QUALITY_MARKERS, CONTEXT_TEMPLATES: _CONTEXT_TEMPLATES, TASK_STRUCTURE_TEMPLATES: _TASK_STRUCTURE_TEMPLATES, COMPLEXITY_MODIFIERS: _COMPLEXITY_MODIFIERS, STOP_WORDS: _STOP_WORDS, ACTION_VERBS: _ACTION_VERBS, DOMAIN_KEYWORDS: _DOMAIN_KEYWORDS, classify: _classify, assessComplexity: _assessComplexity, extractIntent: _extractIntent, detect: _detect, calcRawScore: _calcRawScore, wrapSection: _wrapSection, addRules: _addRules, tokenize: _tokenize, extractKeywords: _extractKeywords, allowedOrigins: _allowedOrigins, app_config: _app_config, cloudinary: _cloudinary, dotenv: _dotenv, mongoDBConfig: _mongoDBConfig, redisConfig: _redisConfig, redis: _redis, userMiddleware: _userMiddleware, validateDTO: _validateDTO, socketFunction: _socketFunction, getNotificationNamespace: _getNotificationNamespace, setupSwagger: _setupSwagger, asyncHandler: _asyncHandler, hashText: _hashText, limiter: _limiter, authlimiter: _authlimiter, logger: _logger, createLogger: _createLogger, normalizePagination: _normalizePagination, paginate: _paginate, auth_module: _auth_module, notification_module: _notification_module, user_module: _user_module, agent_module: _agent_module, app_module: _app_module });

declare global {
  var addJobToQueue: typeof _addJobToQueue
  var queue: typeof _queue
  var sendEmail: typeof _sendEmail
  var jobProcessor: typeof _jobProcessor
  var RegisterDTO: typeof _RegisterDTO
  var LoginDTO: typeof _LoginDTO
  var OauthService: typeof _OauthService
  var BasedAuthService: typeof _BasedAuthService
  var registerController: typeof _registerController
  var refreshController: typeof _refreshController
  var logoutController: typeof _logoutController
  var loginController: typeof _loginController
  var googleController: typeof _googleController
  var forgetPasswordController: typeof _forgetPasswordController
  var resetPasswordController: typeof _resetPasswordController
  var token_PASETO: typeof _token_PASETO
  var PublishNotificationDTO: typeof _PublishNotificationDTO
  var GetNotificationsDTO: typeof _GetNotificationsDTO
  var NotificationModel: typeof _NotificationModel
  var NotificationHistoryService: typeof _NotificationHistoryService
  var publishNotification: typeof _publishNotification
  var registerClient: typeof _registerClient
  var getActiveClients: typeof _getActiveClients
  var formatSSEEvent: typeof _formatSSEEvent
  var formatHeartbeat: typeof _formatHeartbeat
  var streamController: typeof _streamController
  var publishController: typeof _publishController
  var getNotificationsController: typeof _getNotificationsController
  var markSeenController: typeof _markSeenController
  var markAllSeenController: typeof _markAllSeenController
  var EditProfileDTO: typeof _EditProfileDTO
  var UserModel: typeof _UserModel
  var BasedUserService: typeof _BasedUserService
  var profileMiddleware: typeof _profileMiddleware
  var editProfileController: typeof _editProfileController
  var deleteAccountController: typeof _deleteAccountController
  var profileController: typeof _profileController
  var AnalyzeDTO: typeof _AnalyzeDTO
  var LearnedWeightModel: typeof _LearnedWeightModel
  var AgentService: typeof _AgentService
  var analyzeController: typeof _analyzeController
  var PromptHistoryModel: typeof _PromptHistoryModel
  var TokenLedgerModel: typeof _TokenLedgerModel
  var PaymentHistoryModel: typeof _PaymentHistoryModel
  var PlanModel: typeof _PlanModel
  var TemplateModel: typeof _TemplateModel
  var uploadToCloudinary: typeof _uploadToCloudinary
  var upload: typeof _upload
  var USER_PLAN: typeof _USER_PLAN
  var TOKEN_LEDGER_ACTION: typeof _TOKEN_LEDGER_ACTION
  var PLAN_PROVIDER: typeof _PLAN_PROVIDER
  var PAYMENT_STATUS: typeof _PAYMENT_STATUS
  var PAYMENT_METHOD: typeof _PAYMENT_METHOD
  var AppError: typeof _AppError
  var errorHandler: typeof _errorHandler
  var CATEGORY_KEYWORDS: typeof _CATEGORY_KEYWORDS
  var ACTION_KEYWORDS: typeof _ACTION_KEYWORDS
  var ROLE_TEMPLATES: typeof _ROLE_TEMPLATES
  var BASE_CONSTRAINTS: typeof _BASE_CONSTRAINTS
  var CATEGORY_CONSTRAINTS: typeof _CATEGORY_CONSTRAINTS
  var OUTPUT_FORMATS: typeof _OUTPUT_FORMATS
  var MODEL_FORMAT_SUFFIX: typeof _MODEL_FORMAT_SUFFIX
  var SPECIFICITY_MAP: typeof _SPECIFICITY_MAP
  var QUALITY_MARKERS: typeof _QUALITY_MARKERS
  var CONTEXT_TEMPLATES: typeof _CONTEXT_TEMPLATES
  var TASK_STRUCTURE_TEMPLATES: typeof _TASK_STRUCTURE_TEMPLATES
  var COMPLEXITY_MODIFIERS: typeof _COMPLEXITY_MODIFIERS
  var STOP_WORDS: typeof _STOP_WORDS
  var ACTION_VERBS: typeof _ACTION_VERBS
  var DOMAIN_KEYWORDS: typeof _DOMAIN_KEYWORDS
  var classify: typeof _classify
  var assessComplexity: typeof _assessComplexity
  var extractIntent: typeof _extractIntent
  var detect: typeof _detect
  var calcRawScore: typeof _calcRawScore
  var wrapSection: typeof _wrapSection
  var addRules: typeof _addRules
  var tokenize: typeof _tokenize
  var extractKeywords: typeof _extractKeywords
  var allowedOrigins: typeof _allowedOrigins
  var app_config: typeof _app_config
  var cloudinary: typeof _cloudinary
  var dotenv: typeof _dotenv
  var mongoDBConfig: typeof _mongoDBConfig
  var redisConfig: typeof _redisConfig
  var redis: typeof _redis
  var userMiddleware: typeof _userMiddleware
  var validateDTO: typeof _validateDTO
  var socketFunction: typeof _socketFunction
  var getNotificationNamespace: typeof _getNotificationNamespace
  var setupSwagger: typeof _setupSwagger
  var asyncHandler: typeof _asyncHandler
  var hashText: typeof _hashText
  var limiter: typeof _limiter
  var authlimiter: typeof _authlimiter
  var logger: typeof _logger
  var createLogger: typeof _createLogger
  var normalizePagination: typeof _normalizePagination
  var paginate: typeof _paginate
  var auth_module: typeof _auth_module
  var notification_module: typeof _notification_module
  var user_module: typeof _user_module
  var agent_module: typeof _agent_module
  var app_module: typeof _app_module
}
