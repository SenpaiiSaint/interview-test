/**
 * Represents the possible statuses a task can have
 */
export type TaskStatus = 'pending' | 'completed' | 'in_progress';

/**
 * Represents the possible categories a task can belong to
 */
export type TaskCategory = 
  | 'health'
  | 'work'
  | 'personal'
  | 'shopping'
  | 'other';

/**
 * Represents a task extracted from text
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** The original text that was used to create the task */
  task_text: string;
  /** When the task needs to be completed by */
  due_date: Date | null;
  /** Current status of the task */
  status: TaskStatus;
  /** Category the task belongs to */
  category: TaskCategory;
  /** When the task was created */
  created_at: Date;
  /** When the task was last updated */
  updated_at: Date;
}

/**
 * Result of attempting to extract a task from text
 */
export interface TaskExtractionResult {
  /** The extracted task */
  task: Task;
  /** Confidence score of the extraction (0-1) */
  confidence: number;
  /** The original text that was processed */
  source_text: string;
}

/**
 * Options for configuring task extraction
 */
export interface TaskExtractionOptions {
  /** Default category to use if none can be determined */
  defaultCategory?: TaskCategory;
  /** Default status to assign to new tasks */
  defaultStatus?: TaskStatus;
  /** Minimum confidence score required to return a result */
  minConfidence?: number;
}

/**
 * Configuration for the task extractor
 */
export interface TaskExtractorConfig {
  /** Minimum confidence score required to return a result */
  minConfidence: number;
  /** Default category to use if none can be determined */
  defaultCategory: TaskCategory;
  /** Default status to assign to new tasks */
  defaultStatus: TaskStatus;
} 