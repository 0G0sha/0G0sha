import { LearnedWeight, PromptCategory, SimilarPrompt } from "../@types";

const SIMILARITY_THRESHOLD = 0.3;
const WEIGHT_BOOST = 0.1;
const WEIGHT_PENALTY = 0.05;
const WEIGHT_CAP = 3.0;
const WEIGHT_FLOOR = 0.2;
const SCORE_BOOST_MIN = 7;
const SCORE_PENALIZE_MAX = 5;

// ─────────────────────────────────────────────────────────────
// Learner
//
// The brain of Gosha. 5 methods, 3 paths:
//
// READ PATH  (during optimization):
//   findSimilar() — MongoDB text search for past high-scoring prompts
//   getWeights()  — Load per-rule weights for a category
//
// WRITE PATH (after optimization):
//   recordResult() — Save to prompt_history + increment rule usage
//
// FEEDBACK PATH (on user rating):
//   applyFeedback() — Boost/penalize rule weights based on score
//
// INIT:
//   initWeights() — Seed weight records (idempotent)
// ─────────────────────────────────────────────────────────────

export class Learner {
     // ═══════════════════════════════════════════════════════════
     // READ PATH
     // ═══════════════════════════════════════════════════════════

     /**
      * Find the most similar past prompt that scored well.
      *
      * Uses MongoDB $text index on originalText + keywords.
      * Filters by same category + userScore >= 7.
      * Normalizes textScore to 0-1, applies threshold.
      *
      * @returns Best match or null if nothing relevant found
      */
     async findSimilar(text: string, category: PromptCategory): Promise<SimilarPrompt | null> {
          const results = await PromptHistoryModel.find(
               {
                    $text: { $search: text },
                    category,
                    userScore: { $gte: SCORE_BOOST_MIN },
               },
               { score: { $meta: 'textScore' } },
          )
               .sort({ score: { $meta: 'textScore' } })
               .limit(3)
               .lean()
               .exec();

          if (results.length === 0) return null;

          const best = results[0];

          // MongoDB textScore is typically 0.5-2.0 for prompt-length texts.
          // Normalize to 0-1 by dividing by 2.
          const textScore = (best as unknown as Record<string, number>).score ?? 0;
          const similarity = Math.min(textScore / 2, 1);

          if (similarity < SIMILARITY_THRESHOLD) return null;

          return {
               originalText: best.originalText,
               optimizedText: best.optimizedText,
               score: best.userScore ?? best.score,
               category: best.category as PromptCategory,
               rulesApplied: best.rulesApplied,
               similarity,
          };
     }

     async getWeights(category: PromptCategory): Promise<LearnedWeight[]> {
          const weights = await LearnedWeightModel
               .find({ category })
               .lean()
               .exec();

          return weights.map((w) => ({
               ruleId: w.ruleId,
               category: w.category,
               weight: w.weight,
               totalUses: w.totalUses,
               avgScore: w.avgScore,
          }));
     }

     // ═══════════════════════════════════════════════════════════
     // WRITE PATH
     // ═══════════════════════════════════════════════════════════

     /**
      * Save an optimization result to prompt_history.
      * Also increments totalUses on all rules that fired.
      *
      * @returns The created document's _id as string (used by token system)
      */
     async recordResult(params: {
          originalText: string;
          optimizedText: string;
          category: PromptCategory;
          targetModel: string;
          rulesApplied: string[];
          score: number;
          keywords: string[];
          tokensCost: number;
          userId?: string;
     }): Promise<string> {
          const doc = await PromptHistoryModel.create({
               originalText: params.originalText,
               optimizedText: params.optimizedText,
               category: params.category,
               targetModel: params.targetModel,
               rulesApplied: params.rulesApplied,
               score: params.score,
               userScore: null,
               userId: params.userId ?? null,
               keywords: params.keywords,
               tokensCost: params.tokensCost,
          });

          // Increment usage count for each rule that fired
          if (params.rulesApplied.length > 0) {
               await this.incrementRuleUsage(params.rulesApplied, params.category);
          }

          return doc._id.toString();
     }

     // ═══════════════════════════════════════════════════════════
     // FEEDBACK PATH — This is where Gosha LEARNS
     // ═══════════════════════════════════════════════════════════

     /**
      * Apply user feedback to update rule weights.
      *
      * Score >= 7 → BOOST each rule's weight by +0.1 (cap 3.0)
      * Score < 5  → PENALIZE each rule's weight by -0.05 (floor 0.2)
      * Score 5-6  → NEUTRAL (track score, no weight change)
      *
      * Why asymmetric: Users rate negatively more impulsively.
      * Boost > Penalize protects against noisy negative feedback.
      *
      * @param promptId - The optimization to rate
      * @param userScore - User's rating 1-10
      */
     async applyFeedback(promptId: string, userScore: number): Promise<void> {
          // Load the prompt to get rulesApplied + category
          const prompt = await PromptHistoryModel.findById(promptId);
          if (!prompt) throw AppError.notFound('Prompt not found');

          // Save user score on the prompt
          prompt.userScore = userScore;
          await prompt.save();

          // Update weights for each rule that was used
          for (const ruleId of prompt.rulesApplied) {
               await this.updateRuleWeight(ruleId, prompt.category as PromptCategory, userScore);
          }
     }

     // ═══════════════════════════════════════════════════════════
     // INIT
     // ═══════════════════════════════════════════════════════════

     /**
      * Initialize weight records for all rule × category pairs.
      *
      * Uses $setOnInsert so existing weights are NOT overwritten.
      * Safe to call multiple times (idempotent).
      * Called on server startup + by seed script.
      */
     async initWeights(ruleIds: string[], category: PromptCategory): Promise<void> {
          const ops = ruleIds.map((ruleId) => ({
               updateOne: {
                    filter: { ruleId, category },
                    update: {
                         $setOnInsert: {
                              ruleId,
                              category,
                              weight: 1.0,
                              totalUses: 0,
                              totalScore: 0,
                              avgScore: 0,
                         },
                    },
                    upsert: true,
               },
          }));

          await LearnedWeightModel.bulkWrite(ops);
     }

     // ═══════════════════════════════════════════════════════════
     // PRIVATE HELPERS
     // ═══════════════════════════════════════════════════════════

     /**
      * Update a single rule's weight based on user feedback score.
      *
      * Three outcomes:
      * - BOOST:    score >= 7 → weight += 0.1, capped at 3.0
      * - PENALIZE: score < 5  → weight -= 0.05, floored at 0.2
      * - NEUTRAL:  score 5-6  → no weight change, just track score
      *
      * In all cases: totalScore += userScore, totalUses += 1, recalc avgScore.
      */
     private async updateRuleWeight(
          ruleId: string,
          category: PromptCategory,
          userScore: number,
     ): Promise<void> {
          const filter = { ruleId, category };

          // Always track the score
          const scoreUpdate = {
               $inc: {
                    totalScore: userScore,
                    totalUses: 1,
               },
          };

          if (userScore >= SCORE_BOOST_MIN) {
               // BOOST — this rule combination worked well
               await LearnedWeightModel.updateOne(filter, {
                    ...scoreUpdate,
                    $inc: {
                         ...scoreUpdate.$inc,
                         weight: WEIGHT_BOOST,
                    },
               });

               // Enforce cap — $min sets weight to the smaller of current or cap
               await this.enforceWeightCap(ruleId, category);
          } else if (userScore < SCORE_PENALIZE_MAX) {
               // PENALIZE — this rule combination didn't work
               await LearnedWeightModel.updateOne(filter, {
                    ...scoreUpdate,
                    $inc: {
                         ...scoreUpdate.$inc,
                         weight: -WEIGHT_PENALTY,
                    },
               });

               // Enforce floor
               await this.enforceWeightFloor(ruleId, category);
          } else {
               // NEUTRAL (5-6) — just track, no weight change
               await LearnedWeightModel.updateOne(filter, scoreUpdate);
          }

          // Recalculate avgScore
          await this.recalcAvgScore(ruleId, category);
     }

     /**
      * Enforce weight cap — if weight exceeded 3.0, set it to 3.0.
      */
     private async enforceWeightCap(ruleId: string, category: PromptCategory): Promise<void> {
          await LearnedWeightModel.updateOne(
               { ruleId, category, weight: { $gt: WEIGHT_CAP } },
               { $set: { weight: WEIGHT_CAP } },
          );
     }

     /**
      * Enforce weight floor — if weight dropped below 0.2, set it to 0.2.
      */
     private async enforceWeightFloor(ruleId: string, category: PromptCategory): Promise<void> {
          await LearnedWeightModel.updateOne(
               { ruleId, category, weight: { $lt: WEIGHT_FLOOR } },
               { $set: { weight: WEIGHT_FLOOR } },
          );
     }

     /**
      * Recalculate avgScore = totalScore / totalUses.
      */
     private async recalcAvgScore(ruleId: string, category: PromptCategory): Promise<void> {
          const weight = await LearnedWeightModel.findOne({ ruleId, category });
          if (!weight || weight.totalUses === 0) return;

          weight.avgScore = Math.round((weight.totalScore / weight.totalUses) * 100) / 100;
          await weight.save();
     }

     /**
      * Increment totalUses on all rules that fired during an optimization.
      * Called by recordResult() — tracks usage frequency per category.
      */
     private async incrementRuleUsage(ruleIds: string[], category: PromptCategory): Promise<void> {
          await LearnedWeightModel.updateMany(
               { ruleId: { $in: ruleIds }, category },
               { $inc: { totalUses: 1 } },
          );
     }
}
