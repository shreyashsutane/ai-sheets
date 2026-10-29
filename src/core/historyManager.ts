import { Workbook } from '../types/spreadsheet';

export class HistoryManager {
  private past: Workbook[] = [];
  private future: Workbook[] = [];
  private maxHistory: number = 50;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  /**
   * Push current state before making a change
   */
  public pushState(currentState: Workbook): void {
    // Deep clone workbook to preserve history
    const cloned = JSON.parse(JSON.stringify(currentState));
    this.past.push(cloned);
    if (this.past.length > this.maxHistory) {
      this.past.shift();
    }
    // Clear redo history when a new action is performed
    this.future = [];
  }

  /**
   * Undo to previous state
   */
  public undo(currentState: Workbook): Workbook | null {
    if (this.past.length === 0) return null;
    const previous = this.past.pop()!;
    this.future.push(JSON.parse(JSON.stringify(currentState)));
    return previous;
  }

  /**
   * Redo to future state
   */
  public redo(currentState: Workbook): Workbook | null {
    if (this.future.length === 0) return null;
    const next = this.future.pop()!;
    this.past.push(JSON.parse(JSON.stringify(currentState)));
    return next;
  }

  public canUndo(): boolean {
    return this.past.length > 0;
  }

  public canRedo(): boolean {
    return this.future.length > 0;
  }

  public clear(): void {
    this.past = [];
    this.future = [];
  }
}
