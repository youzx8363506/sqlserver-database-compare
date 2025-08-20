import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 配置文件路径
const CONFIG_FILE_PATH = path.join(__dirname, '../config/database-configs.json');

// 数据库配置接口
interface DatabaseConfig {
  server: string;
  database: string;
  authentication: {
    type: 'windows' | 'sql';
    username?: string;
    password?: string;
  };
}

interface DatabaseConfigPair {
  source: DatabaseConfig;
  target: DatabaseConfig;
}

interface SavedConfig {
  id: string;
  name: string;
  source: DatabaseConfig;
  target: DatabaseConfig;
  createdAt: string;
  lastUsedAt: string;
}

interface ConfigStore {
  lastUsed: DatabaseConfigPair | null;
  savedConfigs: SavedConfig[];
}

// 读取配置文件
const readConfigFile = async (): Promise<ConfigStore> => {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log(`📁 [配置] 配置文件不存在或损坏，创建默认配置`);
    return {
      lastUsed: null,
      savedConfigs: []
    };
  }
};

// 写入配置文件
const writeConfigFile = async (config: ConfigStore): Promise<void> => {
  try {
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`💾 [配置] 配置文件已保存到: ${CONFIG_FILE_PATH}`);
  } catch (error) {
    console.error(`❌ [配置] 写入配置文件失败:`, error);
    throw new Error('保存配置失败');
  }
};

// 获取最近使用的配置
router.get('/database/last-used', async (req, res) => {
  try {
    console.log(`📋 [配置] 获取最近使用的数据库配置`);
    const config = await readConfigFile();
    
    res.json({
      success: true,
      data: config.lastUsed
    });
  } catch (error: any) {
    console.error('❌ [配置] 获取最近配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取配置失败',
      details: error.message
    });
  }
});

// 保存最近使用的配置
router.post('/database/last-used', async (req, res) => {
  try {
    const { source, target } = req.body as DatabaseConfigPair;
    
    console.log(`💾 [配置] 保存最近使用的配置`);
    console.log(`📊 [配置] 源数据库: ${source.server}.${source.database}`);
    console.log(`📊 [配置] 目标数据库: ${target.server}.${target.database}`);
    
    if (!source || !target) {
      return res.status(400).json({
        success: false,
        error: '源数据库和目标数据库配置不能为空'
      });
    }

    const config = await readConfigFile();
    config.lastUsed = { source, target };
    await writeConfigFile(config);

    res.json({
      success: true,
      message: '最近使用的配置已保存'
    });
  } catch (error: any) {
    console.error('❌ [配置] 保存最近配置失败:', error);
    res.status(500).json({
      success: false,
      error: '保存配置失败',
      details: error.message
    });
  }
});

// 获取保存的配置列表
router.get('/database/saved', async (req, res) => {
  try {
    console.log(`📋 [配置] 获取保存的配置列表`);
    const config = await readConfigFile();
    
    // 按最近使用时间排序
    const sortedConfigs = config.savedConfigs.sort((a, b) => 
      new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
    );
    
    console.log(`📊 [配置] 返回 ${sortedConfigs.length} 个保存的配置`);
    
    res.json({
      success: true,
      data: sortedConfigs,
      count: sortedConfigs.length
    });
  } catch (error: any) {
    console.error('❌ [配置] 获取配置列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取配置列表失败',
      details: error.message
    });
  }
});

// 保存新的配置
router.post('/database/saved', async (req, res) => {
  try {
    const { name, source, target } = req.body;
    
    console.log(`💾 [配置] 保存新配置: ${name}`);
    
    if (!name || !source || !target) {
      return res.status(400).json({
        success: false,
        error: '配置名称、源数据库和目标数据库不能为空'
      });
    }

    const config = await readConfigFile();
    
    // 检查名称是否已存在
    const existingConfig = config.savedConfigs.find(c => c.name === name);
    if (existingConfig) {
      return res.status(400).json({
        success: false,
        error: '配置名称已存在，请使用不同的名称'
      });
    }

    const newConfig: SavedConfig = {
      id: uuidv4(),
      name,
      source,
      target,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString()
    };

    config.savedConfigs.push(newConfig);
    await writeConfigFile(config);

    console.log(`✅ [配置] 配置 "${name}" 保存成功，ID: ${newConfig.id}`);

    res.json({
      success: true,
      data: newConfig,
      message: '配置保存成功'
    });
  } catch (error: any) {
    console.error('❌ [配置] 保存配置失败:', error);
    res.status(500).json({
      success: false,
      error: '保存配置失败',
      details: error.message
    });
  }
});

// 更新配置
router.put('/database/saved/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, source, target } = req.body;
    
    console.log(`🔄 [配置] 更新配置: ${id}`);
    
    if (!name || !source || !target) {
      return res.status(400).json({
        success: false,
        error: '配置名称、源数据库和目标数据库不能为空'
      });
    }

    const config = await readConfigFile();
    const configIndex = config.savedConfigs.findIndex(c => c.id === id);
    
    if (configIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '配置不存在'
      });
    }

    // 检查名称是否与其他配置冲突
    const nameConflict = config.savedConfigs.find(c => c.name === name && c.id !== id);
    if (nameConflict) {
      return res.status(400).json({
        success: false,
        error: '配置名称已存在，请使用不同的名称'
      });
    }

    // 更新配置
    config.savedConfigs[configIndex] = {
      ...config.savedConfigs[configIndex],
      name,
      source,
      target,
      lastUsedAt: new Date().toISOString()
    };

    await writeConfigFile(config);

    console.log(`✅ [配置] 配置 "${name}" 更新成功`);

    res.json({
      success: true,
      data: config.savedConfigs[configIndex],
      message: '配置更新成功'
    });
  } catch (error: any) {
    console.error('❌ [配置] 更新配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新配置失败',
      details: error.message
    });
  }
});

// 删除配置
router.delete('/database/saved/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ [配置] 删除配置: ${id}`);
    
    const config = await readConfigFile();
    const configIndex = config.savedConfigs.findIndex(c => c.id === id);
    
    if (configIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '配置不存在'
      });
    }

    const deletedConfig = config.savedConfigs[configIndex];
    config.savedConfigs.splice(configIndex, 1);
    await writeConfigFile(config);

    console.log(`✅ [配置] 配置 "${deletedConfig.name}" 删除成功`);

    res.json({
      success: true,
      message: '配置删除成功'
    });
  } catch (error: any) {
    console.error('❌ [配置] 删除配置失败:', error);
    res.status(500).json({
      success: false,
      error: '删除配置失败',
      details: error.message
    });
  }
});

// 应用保存的配置（更新最近使用时间）
router.post('/database/saved/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔄 [配置] 应用配置: ${id}`);
    
    const config = await readConfigFile();
    const configIndex = config.savedConfigs.findIndex(c => c.id === id);
    
    if (configIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '配置不存在'
      });
    }

    // 更新最近使用时间
    config.savedConfigs[configIndex].lastUsedAt = new Date().toISOString();
    
    // 同时更新为最近使用的配置
    const appliedConfig = config.savedConfigs[configIndex];
    config.lastUsed = {
      source: appliedConfig.source,
      target: appliedConfig.target
    };
    
    await writeConfigFile(config);

    console.log(`✅ [配置] 配置 "${appliedConfig.name}" 应用成功`);

    res.json({
      success: true,
      data: {
        source: appliedConfig.source,
        target: appliedConfig.target
      },
      message: '配置应用成功'
    });
  } catch (error: any) {
    console.error('❌ [配置] 应用配置失败:', error);
    res.status(500).json({
      success: false,
      error: '应用配置失败',
      details: error.message
    });
  }
});

export default router;