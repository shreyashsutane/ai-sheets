import { SheetData, Workbook } from '../types/spreadsheet';
import { evaluateFormula } from './formulaEvaluator';

export class DependencyGraph {
  // cellKey -> Set of cellKeys that this cell depends on (precedents)
  private dependencies: Map<string, Set<string>> = new Map();
  // cellKey -> Set of cellKeys that depend on this cell (dependents)
  private dependents: Map<string, Set<string>> = new Map();

  /**
   * Set dependencies for a cell
   */
  public setCellDependencies(cellKey: string, referencedCells: string[]): void {
    // Remove old dependents
    const oldDeps = this.dependencies.get(cellKey);
    if (oldDeps) {
      for (const dep of oldDeps) {
        this.dependents.get(dep)?.delete(cellKey);
      }
    }

    // Set new dependencies
    const newDeps = new Set(referencedCells);
    this.dependencies.set(cellKey, newDeps);

    for (const dep of referencedCells) {
      if (!this.dependents.has(dep)) {
        this.dependents.set(dep, new Set());
      }
      this.dependents.get(dep)!.add(cellKey);
    }
  }

  /**
   * Remove a cell from the graph
   */
  public removeCell(cellKey: string): void {
    const oldDeps = this.dependencies.get(cellKey);
    if (oldDeps) {
      for (const dep of oldDeps) {
        this.dependents.get(dep)?.delete(cellKey);
      }
    }
    this.dependencies.delete(cellKey);
    this.dependents.delete(cellKey);
  }

  /**
   * Check if adding an edge from cellKey -> targetKey introduces a cycle
   */
  public hasCycle(cellKey: string, visited = new Set<string>()): boolean {
    if (visited.has(cellKey)) return true;
    visited.add(cellKey);

    const deps = this.dependencies.get(cellKey);
    if (deps) {
      for (const dep of deps) {
        if (this.hasCycle(dep, new Set(visited))) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get all cells affected by changes to the specified changed keys in topological order
   */
  public getEvaluationOrder(changedKeys: string[]): string[] {
    const affected = new Set<string>();
    const queue = [...changedKeys];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const directDependents = this.dependents.get(current);
      if (directDependents) {
        for (const dep of directDependents) {
          if (!affected.has(dep)) {
            affected.add(dep);
            queue.push(dep);
          }
        }
      }
    }

    // Topological sort of affected cells
    const order: string[] = [];
    const visited = new Set<string>();
    const tempMarked = new Set<string>();

    const visit = (node: string) => {
      if (tempMarked.has(node)) {
        // Cycle detected
        return;
      }
      if (!visited.has(node)) {
        tempMarked.add(node);
        const deps = this.dependencies.get(node);
        if (deps) {
          for (const dep of deps) {
            if (affected.has(dep)) {
              visit(dep);
            }
          }
        }
        tempMarked.delete(node);
        visited.add(node);
        order.push(node);
      }
    };

    for (const node of affected) {
      if (!visited.has(node)) {
        visit(node);
      }
    }

    return order;
  }
}

/**
 * Recalculate an entire sheet or updated cells
 */
export function recalculateSheet(
  sheet: SheetData,
  workbook?: Workbook,
  changedCellKeys?: string[]
): SheetData {
  const updatedSheet: SheetData = {
    ...sheet,
    cells: { ...sheet.cells },
  };

  const graph = new DependencyGraph();

  // 1. Build initial dependency graph from formulas
  for (const [key, cell] of Object.entries(updatedSheet.cells)) {
    if (cell.formula && cell.formula.startsWith('=')) {
      const result = evaluateFormula(cell.formula, {
        currentSheet: updatedSheet,
        workbook,
        evaluatingCellKey: key,
      });
      graph.setCellDependencies(key, result.referencedCells);
    }
  }

  // 2. Determine cells that need recalculation
  const cellKeysToRecalc = changedCellKeys && changedCellKeys.length > 0
    ? [...changedCellKeys, ...graph.getEvaluationOrder(changedCellKeys)]
    : Object.keys(updatedSheet.cells);

  // 3. Evaluate each formula in order
  for (const key of cellKeysToRecalc) {
    const cell = updatedSheet.cells[key];
    if (!cell) continue;

    if (cell.formula && cell.formula.startsWith('=')) {
      if (graph.hasCycle(key)) {
        updatedSheet.cells[key] = {
          ...cell,
          computedValue: '#CYCLE!',
          error: 'Circular dependency detected',
        };
      } else {
        const result = evaluateFormula(cell.formula, {
          currentSheet: updatedSheet,
          workbook,
          evaluatingCellKey: key,
        });

        updatedSheet.cells[key] = {
          ...cell,
          computedValue: result.value,
          error: result.error,
        };
      }
    } else {
      // Non-formula cell: computed value is raw value
      updatedSheet.cells[key] = {
        ...cell,
        computedValue: cell.value,
        error: undefined,
      };
    }
  }

  return updatedSheet;
}
