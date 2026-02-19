import { z } from "zod";

export const LABEL_TYPES = [
	"discrete",
	"extractive",
	"generative",
	"rubric_scored",
	"set_valued",
] as const;
export type LabelType = (typeof LABEL_TYPES)[number];

const discreteValueSchema = z.object({
	choice: z.string().min(1),
});

const extractiveValueSchema = z.object({
	spans: z
		.array(
			z.object({
				start: z.number().int().nonneg(),
				end: z.number().int().positive(),
				text: z.string(),
			}),
		)
		.min(1),
});

const generativeValueSchema = z.object({
	text: z.string().min(1),
});

const rubricScoredValueSchema = z.object({
	scores: z
		.array(
			z.object({
				criterion_id: z.string(),
				criterion_name: z.string(),
				score: z.number().min(0).max(10),
				justification: z.string().optional(),
			}),
		)
		.min(1),
});

const setValuedValueSchema = z.object({
	values: z.array(z.string().min(1)).min(1),
});

export const LABEL_VALUE_SCHEMAS = {
	discrete: discreteValueSchema,
	extractive: extractiveValueSchema,
	generative: generativeValueSchema,
	rubric_scored: rubricScoredValueSchema,
	set_valued: setValuedValueSchema,
} as const;

export type DiscreteValue = z.infer<typeof discreteValueSchema>;
export type ExtractiveValue = z.infer<typeof extractiveValueSchema>;
export type GenerativeValue = z.infer<typeof generativeValueSchema>;
export type RubricScoredValue = z.infer<typeof rubricScoredValueSchema>;
export type SetValuedValue = z.infer<typeof setValuedValueSchema>;

export type LabelValue =
	| DiscreteValue
	| ExtractiveValue
	| GenerativeValue
	| RubricScoredValue
	| SetValuedValue;

export function validateLabelValue(
	type: LabelType,
	value: unknown,
): LabelValue {
	const schema = LABEL_VALUE_SCHEMAS[type];
	return schema.parse(value) as LabelValue;
}
