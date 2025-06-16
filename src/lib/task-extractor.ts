import { Task, TaskCategory, TaskExtractionResult, TaskExtractionOptions, TaskExtractorConfig } from '../types/task';

/**
 * Service for extracting tasks from natural language text
 */
export class TaskExtractor {
  private static readonly DEFAULT_CONFIG: TaskExtractorConfig = {
    minConfidence: 0.3,
    defaultCategory: 'other',
    defaultStatus: 'pending'
  };

  private static readonly TASK_VERBS = [
    'need', 'have to', 'must', 'should', 'want to', 'plan to',
    'going to', 'gonna', 'call', 'schedule', 'book', 'make',
    'set up', 'arrange', 'prepare', 'do', 'complete', 'finish',
    'submit', 'send', 'write', 'create', 'organize', 'clean',
    'buy', 'purchase', 'get', 'pick up', 'drop off'
  ];

  private static readonly CATEGORY_KEYWORDS: Record<TaskCategory, string[]> = {
    health: [
      'doctor', 'appointment', 'medical', 'health', 'checkup',
      'medicine', 'pharmacy', 'dentist', 'hospital', 'clinic',
      'therapy', 'treatment', 'vaccine', 'test', 'scan'
    ],
    work: [
      'meeting', 'deadline', 'project', 'report', 'email',
      'call', 'work', 'office', 'presentation', 'document',
      'client', 'team', 'business', 'conference', 'interview'
    ],
    personal: [
      'family', 'friend', 'home', 'house', 'clean',
      'organize', 'garden', 'pet', 'child', 'parent',
      'relative', 'neighbor', 'community', 'volunteer'
    ],
    shopping: [
      'buy', 'purchase', 'shop', 'grocery', 'store',
      'market', 'mall', 'online', 'order', 'delivery',
      'return', 'exchange', 'refund', 'receipt'
    ],
    other: []
  };

  private static readonly DATE_PATTERNS = [
    // Relative dates
    /(?:tomorrow|today|next week|next month|this weekend|this week|this month)/i,
    
    // Explicit dates with month names
    /(?:in|on|by|before|after)\s+(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i,
    
    // Numeric dates
    /(?:in|on|by|before|after)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    
    // Days of the week
    /(?:on|this|next)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    
    // Time-based
    /(?:in|after)\s+(\d+)\s+(?:days?|weeks?|months?|years?)/i
  ];

  /**
   * Extracts a task from the given text
   * @param text The text to extract a task from
   * @param options Optional configuration for the extraction
   * @returns The extracted task or null if no task could be extracted
   */
  public static extractTask(
    text: string,
    options: TaskExtractionOptions = {}
  ): TaskExtractionResult | null {
    try {
      const normalizedText = text.toLowerCase().trim();
      
      // Check if text contains task-related verbs
      const hasTaskVerb = this.TASK_VERBS.some(verb => 
        normalizedText.includes(verb.toLowerCase())
      );

      if (!hasTaskVerb) {
        return null;
      }

      // Extract due date
      const dueDate = this.extractDueDate(normalizedText);

      // Determine category
      const category = this.determineCategory(
        normalizedText,
        options.defaultCategory || this.DEFAULT_CONFIG.defaultCategory
      );

      // Calculate confidence score
      const confidence = this.calculateConfidence(normalizedText, dueDate, category);

      if (confidence < (options.minConfidence || this.DEFAULT_CONFIG.minConfidence)) {
        return null;
      }

      const task: Task = {
        id: crypto.randomUUID(),
        task_text: text,
        due_date: dueDate,
        status: options.defaultStatus || this.DEFAULT_CONFIG.defaultStatus,
        category,
        created_at: new Date(),
        updated_at: new Date()
      };

      return {
        task,
        confidence,
        source_text: text
      };
    } catch (error) {
      console.error('Error extracting task:', error);
      return null;
    }
  }

  /**
   * Extracts a due date from the given text
   * @param text The text to extract a date from
   * @returns The extracted date or null if no date could be found
   */
  private static extractDueDate(text: string): Date | null {
    try {
      for (const pattern of this.DATE_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
          // Handle relative dates
          if (text.includes('tomorrow')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
          }
          if (text.includes('today')) {
            return new Date();
          }
          if (text.includes('next week')) {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            return nextWeek;
          }
          if (text.includes('next month')) {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            return nextMonth;
          }
          if (text.includes('this weekend')) {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const daysUntilWeekend = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
            const weekend = new Date();
            weekend.setDate(today.getDate() + daysUntilWeekend);
            return weekend;
          }

          // Handle explicit dates
          try {
            return new Date(match[1]);
          } catch {
            continue;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error extracting date:', error);
      return null;
    }
  }

  /**
   * Determines the category of a task based on its text
   * @param text The text to analyze
   * @param defaultCategory The default category to use if none can be determined
   * @returns The determined category
   */
  private static determineCategory(
    text: string,
    defaultCategory: TaskCategory = 'other'
  ): TaskCategory {
    try {
      for (const [category, keywords] of Object.entries(this.CATEGORY_KEYWORDS)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          return category as TaskCategory;
        }
      }
      return defaultCategory;
    } catch (error) {
      console.error('Error determining category:', error);
      return defaultCategory;
    }
  }

  /**
   * Calculates a confidence score for the task extraction
   * @param text The text that was processed
   * @param dueDate The extracted due date
   * @param category The determined category
   * @returns A confidence score between 0 and 1
   */
  private static calculateConfidence(
    text: string,
    dueDate: Date | null,
    category: TaskCategory
  ): number {
    try {
      let score = 0.5; // Base score

      // Bonus for having a due date
      if (dueDate) {
        score += 0.2;
      }

      // Bonus for having a specific category
      if (category !== 'other') {
        score += 0.2;
      }

      // Bonus for having task verbs
      const verbCount = this.TASK_VERBS.filter(verb => 
        text.includes(verb.toLowerCase())
      ).length;
      score += Math.min(verbCount * 0.1, 0.1);

      // Bonus for having category keywords
      const categoryKeywords = this.CATEGORY_KEYWORDS[category];
      const keywordCount = categoryKeywords.filter(keyword => 
        text.includes(keyword)
      ).length;
      score += Math.min(keywordCount * 0.05, 0.1);

      return Math.min(score, 1);
    } catch (error) {
      console.error('Error calculating confidence:', error);
      return 0;
    }
  }
} 