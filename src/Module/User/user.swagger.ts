/**
 * @openapi
 * tags:
 *   name: User
 *   description: Authenticated user profile management
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     UserTokens:
 *       type: object
 *       properties:
 *         used:
 *           type: integer
 *           example: 3
 *         limit:
 *           type: integer
 *           example: 10
 *         lastResetAt:
 *           type: string
 *           format: date-time
 *
 *     UserProfile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 64a2f3c8e4b0d12345678901
 *         fullname:
 *           type: string
 *           example: John Doe
 *         username:
 *           type: string
 *           example: johndoe
 *         email:
 *           type: string
 *           format: email
 *           example: john@example.com
 *         avatar:
 *           type: string
 *           format: uri
 *           example: https://res.cloudinary.com/demo/image/upload/avatars/abc123.jpg
 *         apiKey:
 *           type: string
 *           format: uuid
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         plan:
 *           type: string
 *           enum: [free, starter, pro, enterprise]
 *           example: free
 *         tokens:
 *           $ref: '#/components/schemas/UserTokens'
 *         subscription:
 *           type: string
 *           nullable: true
 *           example: null
 *         googleId:
 *           type: string
 *           example: ""
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     EditProfileBody:
 *       type: object
 *       properties:
 *         fullname:
 *           type: string
 *           minLength: 2
 *           example: Jane Doe
 *         username:
 *           type: string
 *           minLength: 2
 *           example: janedoe
 *         avatar:
 *           type: string
 *           format: binary
 *           description: Profile image file (jpg/png). Uploaded to Cloudinary and cropped to 400×400 with face gravity.
 */

/**
 * @openapi
 * /api/v1/users/profile:
 *   get:
 *     tags: [User]
 *     summary: Get the authenticated user's profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile fetched successfully
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   put:
 *     tags: [User]
 *     summary: Update the authenticated user's profile
 *     description: |
 *       Accepts `multipart/form-data`. Send at least one field.
 *       If `avatar` is provided, it is uploaded to Cloudinary (400×400 face crop) and the resulting URL is saved.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/EditProfileBody'
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   delete:
 *     tags: [User]
 *     summary: Delete the authenticated user's account
 *     description: Permanently deletes the user document and clears auth cookies.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
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
 *                   example: Account deleted successfully
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
