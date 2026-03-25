/**
 * @openapi
 * tags:
 *   name: Authentication
 *   description: User registration, login, token management, and password reset
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     RegisterBody:
 *       type: object
 *       required: [name, email, password]
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 100
 *           example: john@example.com
 *         password:
 *           type: string
 *           minLength: 8
 *           maxLength: 64
 *           example: "Password@123"
 *           description: Must contain uppercase, lowercase, number, and special character
 *
 *     LoginBody:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 100
 *           example: john@example.com
 *         password:
 *           type: string
 *           minLength: 8
 *           maxLength: 64
 *           example: "Password@123"
 *
 *     GoogleAuthBody:
 *       type: object
 *       required: [access_token]
 *       properties:
 *         access_token:
 *           type: string
 *           description: Google OAuth2 access token
 *           example: ya29.a0AfH6SM...
 *
 *     ForgetPasswordBody:
 *       type: object
 *       required: [email]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: john@example.com
 *
 *     ResetPasswordBody:
 *       type: object
 *       required: [token, password]
 *       properties:
 *         token:
 *           type: string
 *           description: PASETO forget-password token received via email
 *           example: v4.public.eyJ...
 *         password:
 *           type: string
 *           minLength: 8
 *           maxLength: 64
 *           example: "NewPassword@456"
 *           description: Must contain uppercase, lowercase, number, and special character
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         code:
 *           type: integer
 *           example: 200
 *         status:
 *           type: string
 *           example: OK
 *         timestamp:
 *           type: string
 *           format: date-time
 *         success:
 *           type: boolean
 *           example: true
 *         error:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: User logged in successfully
 *         token:
 *           type: string
 *           description: PASETO access token (also set as httpOnly cookie)
 *           example: v4.public.eyJ...
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         code:
 *           type: integer
 *           example: 400
 *         status:
 *           type: string
 *           example: Bad Request
 *         timestamp:
 *           type: string
 *           format: date-time
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Validation failed
 *
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: PASETO
 *       description: "PASETO v4 access token — obtain from /auth/login, /auth/register, or /auth/refresh"
 */

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterBody'
 *     responses:
 *       201:
 *         description: User created successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: "access_token=v4.public...; HttpOnly; Secure; SameSite=Strict; Max-Age=7200"
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/AuthResponse'
 *               properties:
 *                 code:
 *                   example: 201
 *                 status:
 *                   example: Created
 *                 message:
 *                   example: User created successfully
 *       400:
 *         description: Validation error or email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginBody'
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: "access_token=v4.public...; HttpOnly; Secure; SameSite=Strict; Max-Age=7200"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token using the refresh_token cookie
 *     description: Reads the `refresh_token` httpOnly cookie. Returns new tokens and resets both cookies.
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: "access_token=v4.public...; HttpOnly; Secure; SameSite=Strict"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: Refresh token successful
 *       401:
 *         description: Missing or invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Log out and clear auth cookies
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logout successfully
 */

/**
 * @openapi
 * /api/v1/auth/google:
 *   post:
 *     tags: [Authentication]
 *     summary: Authenticate via Google OAuth2
 *     description: Pass a Google OAuth2 access token. Creates a new account if the email does not exist, otherwise logs in. Cookies use SameSite=None for cross-origin support.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleAuthBody'
 *     responses:
 *       201:
 *         description: Authenticated successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: "access_token=v4.public...; HttpOnly; Secure; SameSite=None"
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/AuthResponse'
 *               properties:
 *                 code:
 *                   example: 201
 *                 status:
 *                   example: Created
 *                 account:
 *                   type: string
 *                   example: active
 *       401:
 *         description: Invalid Google access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/v1/auth/forget-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request a password reset token
 *     description: Returns a PASETO forget-password token valid for 2 hours. In production this token is delivered via email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgetPasswordBody'
 *     responses:
 *       200:
 *         description: Reset token issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       404:
 *         description: Email not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password using the forget-password token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordBody'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User reset password
 *       401:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
