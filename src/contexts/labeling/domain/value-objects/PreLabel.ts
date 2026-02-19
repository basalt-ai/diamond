import type { LabelType, LabelValue } from "./LabelValue";

export interface PreLabel {
	source: string;
	label_type: LabelType;
	value: LabelValue;
	confidence: number;
}
