import { TaskExtractor } from '../lib/task-extractor';
import { mockTranscripts } from '../lib/mock-data';
import { TaskCategory } from '../types/task';

describe('TaskExtractor', () => {
  describe('extractTask', () => {
    it('should extract tasks with high confidence', () => {
      const testCases = [
        {
          input: "I need to call my doctor tomorrow for a checkup",
          expectedCategory: 'health',
          expectedHasDate: true
        },
        {
          input: "Have to schedule a meeting with the team next week",
          expectedCategory: 'work',
          expectedHasDate: true
        },
        {
          input: "Must buy groceries after work today",
          expectedCategory: 'shopping',
          expectedHasDate: true
        },
        {
          input: "Should clean the house before the weekend",
          expectedCategory: 'personal',
          expectedHasDate: true
        }
      ];

      testCases.forEach(({ input, expectedCategory, expectedHasDate }) => {
        const result = TaskExtractor.extractTask(input);
        expect(result).not.toBeNull();
        expect(result?.task.category).toBe(expectedCategory);
        expect(result?.task.due_date !== null).toBe(expectedHasDate);
        expect(result?.confidence).toBeGreaterThan(0.5);
      });
    });

    it('should handle invalid inputs', () => {
      const invalidInputs = [
        "The weather is nice today",
        "I like pizza",
        "This is a random statement",
        "The meeting was productive",
        "The project is going well"
      ];

      invalidInputs.forEach(input => {
        const result = TaskExtractor.extractTask(input);
        expect(result).toBeNull();
      });
    });

    it('should handle tasks with specific dates', () => {
      const testCases = [
        {
          input: "Need to call the doctor on January 15th, 2024",
          expectedDate: new Date('2024-01-15')
        },
        {
          input: "Have to submit the report by 12/31/2023",
          expectedDate: new Date('2023-12-31')
        }
      ];

      testCases.forEach(({ input, expectedDate }) => {
        const result = TaskExtractor.extractTask(input);
        expect(result).not.toBeNull();
        expect(result?.task.due_date).not.toBeNull();
        if (result?.task.due_date) {
          expect(result.task.due_date.getFullYear()).toBe(expectedDate.getFullYear());
          expect(result.task.due_date.getMonth()).toBe(expectedDate.getMonth());
          expect(result.task.due_date.getDate()).toBe(expectedDate.getDate());
        }
      });
    });

    it('should handle tasks with relative dates', () => {
      const testCases = [
        {
          input: "Need to call the doctor tomorrow",
          expectedDaysFromNow: 1
        },
        {
          input: "Have to submit the report next week",
          expectedDaysFromNow: 7
        },
        {
          input: "Must complete the project next month",
          expectedDaysFromNow: 30
        }
      ];

      testCases.forEach(({ input, expectedDaysFromNow }) => {
        const result = TaskExtractor.extractTask(input);
        expect(result).not.toBeNull();
        expect(result?.task.due_date).not.toBeNull();
        if (result?.task.due_date) {
          const today = new Date();
          const expectedDate = new Date();
          expectedDate.setDate(today.getDate() + expectedDaysFromNow);
          expect(result.task.due_date.getDate()).toBe(expectedDate.getDate());
        }
      });
    });

    it('should process mock transcripts', () => {
      const results = mockTranscripts
        .map(text => TaskExtractor.extractTask(text))
        .filter((result): result is NonNullable<typeof result> => result !== null);

      // Test that we're getting reasonable results
      expect(results.length).toBeGreaterThan(0);
      
      // Check that all extracted tasks have required fields
      results.forEach(result => {
        expect(result.task.id).toBeDefined();
        expect(result.task.task_text).toBeDefined();
        expect(result.task.status).toBeDefined();
        expect(result.task.category).toBeDefined();
        expect(result.task.created_at).toBeDefined();
        expect(result.task.updated_at).toBeDefined();
      });

      // Analyze category distribution
      const categoryCounts = results.reduce((acc, result) => {
        acc[result.task.category] = (acc[result.task.category] || 0) + 1;
        return acc;
      }, {} as Record<TaskCategory, number>);

      // Log statistics
      console.log('Extraction Statistics:');
      console.log(`Total tasks extracted: ${results.length}`);
      console.log('Category distribution:', categoryCounts);
      console.log('Average confidence:', 
        results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      );

      // Verify category distribution
      expect(categoryCounts.health).toBeGreaterThan(0);
      expect(categoryCounts.work).toBeGreaterThan(0);
      expect(categoryCounts.personal).toBeGreaterThan(0);
      expect(categoryCounts.shopping).toBeGreaterThan(0);
    });

    it('should handle complex tasks with multiple actions', () => {
      const complexTasks = [
        "Need to call the doctor tomorrow and schedule a follow-up for next month",
        "Have to prepare the presentation for the client meeting next week and book a conference room",
        "Must buy groceries today and prepare dinner for the family tonight"
      ];

      complexTasks.forEach(input => {
        const result = TaskExtractor.extractTask(input);
        expect(result).not.toBeNull();
        expect(result?.confidence).toBeGreaterThan(0.5);
        expect(result?.task.due_date).not.toBeNull();
      });
    });

    it('should respect minimum confidence threshold', () => {
      const options = { minConfidence: 0.8 };
      const lowConfidenceInputs = [
        "The weather is nice today",
        "I like pizza",
        "This is a random statement"
      ];

      lowConfidenceInputs.forEach(input => {
        const result = TaskExtractor.extractTask(input, options);
        expect(result).toBeNull();
      });
    });
  });
}); 