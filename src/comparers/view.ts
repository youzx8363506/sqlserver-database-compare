import { BaseComparer } from './base';
import { ViewInfo, ViewDifferences, ViewModification } from '../types';

export class ViewComparer extends BaseComparer {
  
  compareViews(sourceViews: ViewInfo[], targetViews: ViewInfo[]): ViewDifferences {
    this.logger.info('开始比较视图...');

    const sourceMap = new Map(sourceViews.map(v => [`${v.schemaName}.${v.viewName}`, v]));
    const targetMap = new Map(targetViews.map(v => [`${v.schemaName}.${v.viewName}`, v]));

    const added: ViewInfo[] = [];
    const removed: ViewInfo[] = [];
    const modified: ViewModification[] = [];

    // 查找新增的视图
    for (const [key, view] of targetMap) {
      if (!sourceMap.has(key)) {
        added.push(view);
      }
    }

    // 查找删除的视图和修改的视图
    for (const [key, sourceView] of sourceMap) {
      const targetView = targetMap.get(key);
      
      if (!targetView) {
        removed.push(sourceView);
      } else {
        const modification = this.compareViewDefinitions(sourceView, targetView);
        if (modification.definitionChanged) {
          modified.push(modification);
        }
      }
    }

    this.logger.info(`视图比较完成: 新增 ${added.length}, 删除 ${removed.length}, 修改 ${modified.length}`);

    return { added, removed, modified };
  }

  private compareViewDefinitions(sourceView: ViewInfo, targetView: ViewInfo): ViewModification {
    const sourceDefinition = this.normalizeString(sourceView.definition);
    const targetDefinition = this.normalizeString(targetView.definition);
    
    const definitionChanged = !this.compareValues(sourceDefinition, targetDefinition);

    return {
      viewName: sourceView.viewName,
      schemaName: sourceView.schemaName,
      definitionChanged,
      sourceDefinition: sourceView.definition,
      targetDefinition: targetView.definition
    };
  }
}