import { DomainError, NotFoundError } from "@/lib/domain/DomainError";

export class LabelTaskNotFoundError extends NotFoundError {
	constructor(id: string) {
		super("LabelTask", id);
		this.name = "LabelTaskNotFoundError";
	}
}

export class LabelNotFoundError extends NotFoundError {
	constructor(id: string) {
		super("Label", id);
		this.name = "LabelNotFoundError";
	}
}

export class InvalidLabelTypeError extends DomainError {
	constructor(labelType: string) {
		super(
			`Invalid label type: ${labelType}`,
			"INVALID_LABEL_TYPE",
		);
		this.name = "InvalidLabelTypeError";
	}
}

export class AgreementCheckError extends DomainError {
	constructor(message: string) {
		super(message, "AGREEMENT_CHECK_ERROR");
		this.name = "AgreementCheckError";
	}
}

export class TaskNotAssignableError extends DomainError {
	constructor(taskId: string, currentState: string) {
		super(
			`LabelTask ${taskId} in state ${currentState} cannot be assigned`,
			"TASK_NOT_ASSIGNABLE",
		);
		this.name = "TaskNotAssignableError";
	}
}
