import { Document } from "mongoose";

export interface ILearnedWeight extends Document {
     ruleId: string;
     category: string;
     weight: number;
     totalUses: number;
     totalScore: number;
     avgScore: number;
}
