import { BaseComparer } from './base';
import { 
  TableInfo, 
  TableDifferences, 
  TableModification,
  ColumnChanges,
  ColumnModification,
  IndexChanges,
  IndexModification,
  ConstraintChanges,
  ConstraintModification,
  ColumnInfo,
  IndexInfo,
  ConstraintInfo
} from '../types';

export class TableComparer extends BaseComparer {
  
  compareTables(sourceTables: TableInfo[], targetTables: TableInfo[]): TableDifferences {
    this.logger.info('开始比较表结构...');

    const sourceMap = new Map(sourceTables.map(t => [`${t.schemaName}.${t.tableName}`, t]));
    const targetMap = new Map(targetTables.map(t => [`${t.schemaName}.${t.tableName}`, t]));

    const added: TableInfo[] = [];
    const removed: TableInfo[] = [];
    const modified: TableModification[] = [];

    // 查找新增的表
    for (const [key, table] of targetMap) {
      if (!sourceMap.has(key)) {
        added.push(table);
      }
    }

    // 查找删除的表和修改的表
    for (const [key, sourceTable] of sourceMap) {
      const targetTable = targetMap.get(key);
      
      if (!targetTable) {
        removed.push(sourceTable);
      } else {
        const modification = this.compareTableStructure(sourceTable, targetTable);
        if (this.hasTableChanges(modification)) {
          modified.push(modification);
        }
      }
    }

    this.logger.info(`表比较完成: 新增 ${added.length}, 删除 ${removed.length}, 修改 ${modified.length}`);

    return { added, removed, modified };
  }

  private compareTableStructure(sourceTable: TableInfo, targetTable: TableInfo): TableModification {
    const columnChanges = this.compareColumns(sourceTable.columns, targetTable.columns);
    const indexChanges = this.compareIndexes(sourceTable.indexes, targetTable.indexes);
    const constraintChanges = this.compareConstraints(sourceTable.constraints, targetTable.constraints);

    return {
      tableName: sourceTable.tableName,
      schemaName: sourceTable.schemaName,
      columnChanges,
      indexChanges,
      constraintChanges
    };
  }

  private compareColumns(sourceColumns: ColumnInfo[], targetColumns: ColumnInfo[]): ColumnChanges {
    const sourceMap = new Map(sourceColumns.map(c => [c.columnName.toLowerCase(), c]));
    const targetMap = new Map(targetColumns.map(c => [c.columnName.toLowerCase(), c]));

    const added: ColumnInfo[] = [];
    const removed: ColumnInfo[] = [];
    const modified: ColumnModification[] = [];

    // 查找新增的列
    for (const [name, column] of targetMap) {
      if (!sourceMap.has(name)) {
        added.push(column);
      }
    }

    // 查找删除的列和修改的列
    for (const [name, sourceColumn] of sourceMap) {
      const targetColumn = targetMap.get(name);
      
      if (!targetColumn) {
        removed.push(sourceColumn);
      } else {
        const changes = this.compareColumnProperties(sourceColumn, targetColumn);
        if (changes.length > 0) {
          modified.push({
            columnName: sourceColumn.columnName,
            changes
          });
        }
      }
    }

    return { added, removed, modified };
  }

  private compareColumnProperties(sourceColumn: ColumnInfo, targetColumn: ColumnInfo) {
    const changes = [];

    const properties = [
      'dataType', 'maxLength', 'precision', 'scale', 
      'isNullable', 'defaultValue', 'characterSet', 'collation'
    ];

    for (const prop of properties) {
      const sourceValue = (sourceColumn as any)[prop];
      const targetValue = (targetColumn as any)[prop];
      
      if (!this.compareValues(sourceValue, targetValue)) {
        changes.push(this.createPropertyChange(prop, sourceValue, targetValue));
      }
    }

    return changes;
  }

  private compareIndexes(sourceIndexes: IndexInfo[], targetIndexes: IndexInfo[]): IndexChanges {
    const sourceMap = new Map(sourceIndexes.map(i => [i.indexName.toLowerCase(), i]));
    const targetMap = new Map(targetIndexes.map(i => [i.indexName.toLowerCase(), i]));

    const added: IndexInfo[] = [];
    const removed: IndexInfo[] = [];
    const modified: IndexModification[] = [];

    // 查找新增的索引
    for (const [name, index] of targetMap) {
      if (!sourceMap.has(name)) {
        added.push(index);
      }
    }

    // 查找删除的索引和修改的索引
    for (const [name, sourceIndex] of sourceMap) {
      const targetIndex = targetMap.get(name);
      
      if (!targetIndex) {
        removed.push(sourceIndex);
      } else {
        const changes = this.compareIndexProperties(sourceIndex, targetIndex);
        if (changes.length > 0) {
          modified.push({
            indexName: sourceIndex.indexName,
            changes
          });
        }
      }
    }

    return { added, removed, modified };
  }

  private compareIndexProperties(sourceIndex: IndexInfo, targetIndex: IndexInfo) {
    const changes = [];

    // 比较基本属性
    const properties = ['indexType', 'isUnique', 'isPrimaryKey'];
    for (const prop of properties) {
      const sourceValue = (sourceIndex as any)[prop];
      const targetValue = (targetIndex as any)[prop];
      
      if (!this.compareValues(sourceValue, targetValue)) {
        changes.push(this.createPropertyChange(prop, sourceValue, targetValue));
      }
    }

    // 比较列信息
    const sourceColumns = JSON.stringify(sourceIndex.columns.sort((a, b) => a.keyOrdinal - b.keyOrdinal));
    const targetColumns = JSON.stringify(targetIndex.columns.sort((a, b) => a.keyOrdinal - b.keyOrdinal));
    
    if (sourceColumns !== targetColumns) {
      changes.push(this.createPropertyChange('columns', sourceIndex.columns, targetIndex.columns));
    }

    return changes;
  }

  private compareConstraints(sourceConstraints: ConstraintInfo[], targetConstraints: ConstraintInfo[]): ConstraintChanges {
    const sourceMap = new Map(sourceConstraints.map(c => [c.constraintName.toLowerCase(), c]));
    const targetMap = new Map(targetConstraints.map(c => [c.constraintName.toLowerCase(), c]));

    const added: ConstraintInfo[] = [];
    const removed: ConstraintInfo[] = [];
    const modified: ConstraintModification[] = [];

    // 查找新增的约束
    for (const [name, constraint] of targetMap) {
      if (!sourceMap.has(name)) {
        added.push(constraint);
      }
    }

    // 查找删除的约束和修改的约束
    for (const [name, sourceConstraint] of sourceMap) {
      const targetConstraint = targetMap.get(name);
      
      if (!targetConstraint) {
        removed.push(sourceConstraint);
      } else {
        const changes = this.compareConstraintProperties(sourceConstraint, targetConstraint);
        if (changes.length > 0) {
          modified.push({
            constraintName: sourceConstraint.constraintName,
            changes
          });
        }
      }
    }

    return { added, removed, modified };
  }

  private compareConstraintProperties(sourceConstraint: ConstraintInfo, targetConstraint: ConstraintInfo) {
    const changes = [];

    const properties = ['constraintType', 'definition', 'columnName'];
    for (const prop of properties) {
      const sourceValue = (sourceConstraint as any)[prop];
      const targetValue = (targetConstraint as any)[prop];
      
      if (!this.compareValues(sourceValue, targetValue)) {
        changes.push(this.createPropertyChange(prop, sourceValue, targetValue));
      }
    }

    return changes;
  }

  private hasTableChanges(modification: TableModification): boolean {
    return modification.columnChanges.added.length > 0 ||
           modification.columnChanges.removed.length > 0 ||
           modification.columnChanges.modified.length > 0 ||
           modification.indexChanges.added.length > 0 ||
           modification.indexChanges.removed.length > 0 ||
           modification.indexChanges.modified.length > 0 ||
           modification.constraintChanges.added.length > 0 ||
           modification.constraintChanges.removed.length > 0 ||
           modification.constraintChanges.modified.length > 0;
  }
}