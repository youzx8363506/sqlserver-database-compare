# SQL Server 数据库对象提取查询参考

## 表结构查询

### 获取所有表的基本信息
```sql
SELECT 
    t.TABLE_SCHEMA as SchemaName,
    t.TABLE_NAME as TableName,
    t.TABLE_TYPE as TableType
FROM INFORMATION_SCHEMA.TABLES t
WHERE t.TABLE_TYPE = 'BASE TABLE'
ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME
```

### 获取表的列信息
```sql
SELECT 
    c.TABLE_SCHEMA as SchemaName,
    c.TABLE_NAME as TableName,
    c.COLUMN_NAME as ColumnName,
    c.ORDINAL_POSITION as Position,
    c.COLUMN_DEFAULT as DefaultValue,
    c.IS_NULLABLE as IsNullable,
    c.DATA_TYPE as DataType,
    c.CHARACTER_MAXIMUM_LENGTH as MaxLength,
    c.NUMERIC_PRECISION as Precision,
    c.NUMERIC_SCALE as Scale,
    c.CHARACTER_SET_NAME as CharacterSet,
    c.COLLATION_NAME as Collation
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = @TableName 
    AND c.TABLE_SCHEMA = @SchemaName
ORDER BY c.ORDINAL_POSITION
```

### 获取主键信息
```sql
SELECT 
    tc.TABLE_SCHEMA as SchemaName,
    tc.TABLE_NAME as TableName,
    tc.CONSTRAINT_NAME as ConstraintName,
    kcu.COLUMN_NAME as ColumnName,
    kcu.ORDINAL_POSITION as KeySequence
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
    ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
    AND tc.TABLE_NAME = kcu.TABLE_NAME
WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
ORDER BY tc.TABLE_SCHEMA, tc.TABLE_NAME, kcu.ORDINAL_POSITION
```

### 获取外键信息
```sql
SELECT 
    rc.CONSTRAINT_SCHEMA as SchemaName,
    rc.CONSTRAINT_NAME as ConstraintName,
    kcu1.TABLE_NAME as TableName,
    kcu1.COLUMN_NAME as ColumnName,
    kcu2.TABLE_SCHEMA as ReferencedSchema,
    kcu2.TABLE_NAME as ReferencedTable,
    kcu2.COLUMN_NAME as ReferencedColumn,
    rc.UPDATE_RULE as UpdateRule,
    rc.DELETE_RULE as DeleteRule
FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu1 
    ON rc.CONSTRAINT_NAME = kcu1.CONSTRAINT_NAME
    AND rc.CONSTRAINT_SCHEMA = kcu1.CONSTRAINT_SCHEMA
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu2 
    ON rc.UNIQUE_CONSTRAINT_NAME = kcu2.CONSTRAINT_NAME
    AND rc.UNIQUE_CONSTRAINT_SCHEMA = kcu2.CONSTRAINT_SCHEMA
    AND kcu1.ORDINAL_POSITION = kcu2.ORDINAL_POSITION
ORDER BY rc.CONSTRAINT_SCHEMA, rc.CONSTRAINT_NAME, kcu1.ORDINAL_POSITION
```

## 索引查询

### 获取索引信息
```sql
SELECT 
    s.name as SchemaName,
    t.name as TableName,
    i.name as IndexName,
    i.type_desc as IndexType,
    i.is_unique as IsUnique,
    i.is_primary_key as IsPrimaryKey,
    i.is_unique_constraint as IsUniqueConstraint,
    ic.key_ordinal as KeyOrdinal,
    c.name as ColumnName,
    ic.is_descending_key as IsDescending,
    ic.is_included_column as IsIncluded
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.type > 0  -- 排除堆
ORDER BY s.name, t.name, i.name, ic.key_ordinal
```

## 视图查询

### 获取视图信息
```sql
SELECT 
    v.TABLE_SCHEMA as SchemaName,
    v.TABLE_NAME as ViewName,
    v.VIEW_DEFINITION as Definition,
    v.CHECK_OPTION as CheckOption,
    v.IS_UPDATABLE as IsUpdatable
FROM INFORMATION_SCHEMA.VIEWS v
ORDER BY v.TABLE_SCHEMA, v.TABLE_NAME
```

### 获取视图依赖关系
```sql
SELECT 
    s.name as SchemaName,
    o.name as ViewName,
    rs.name as ReferencedSchema,
    ro.name as ReferencedObject,
    ro.type_desc as ReferencedType
FROM sys.sql_dependencies d
JOIN sys.objects o ON d.object_id = o.object_id
JOIN sys.schemas s ON o.schema_id = s.schema_id
JOIN sys.objects ro ON d.referenced_major_id = ro.object_id
JOIN sys.schemas rs ON ro.schema_id = rs.schema_id
WHERE o.type = 'V'  -- 视图
ORDER BY s.name, o.name
```

## 存储过程查询

### 获取存储过程信息
```sql
SELECT 
    s.name as SchemaName,
    p.name as ProcedureName,
    p.create_date as CreateDate,
    p.modify_date as ModifyDate,
    m.definition as Definition
FROM sys.procedures p
JOIN sys.schemas s ON p.schema_id = s.schema_id
LEFT JOIN sys.sql_modules m ON p.object_id = m.object_id
ORDER BY s.name, p.name
```

### 获取存储过程参数
```sql
SELECT 
    s.name as SchemaName,
    p.name as ProcedureName,
    pm.name as ParameterName,
    pm.parameter_id as ParameterId,
    t.name as DataType,
    pm.max_length as MaxLength,
    pm.precision as Precision,
    pm.scale as Scale,
    pm.is_output as IsOutput,
    pm.has_default_value as HasDefault,
    pm.default_value as DefaultValue
FROM sys.procedures p
JOIN sys.schemas s ON p.schema_id = s.schema_id
JOIN sys.parameters pm ON p.object_id = pm.object_id
JOIN sys.types t ON pm.user_type_id = t.user_type_id
ORDER BY s.name, p.name, pm.parameter_id
```

## 函数查询

### 获取用户定义函数信息
```sql
SELECT 
    s.name as SchemaName,
    f.name as FunctionName,
    f.type_desc as FunctionType,
    f.create_date as CreateDate,
    f.modify_date as ModifyDate,
    m.definition as Definition
FROM sys.objects f
JOIN sys.schemas s ON f.schema_id = s.schema_id
LEFT JOIN sys.sql_modules m ON f.object_id = m.object_id
WHERE f.type IN ('FN', 'IF', 'TF')  -- 标量函数、内联表值函数、表值函数
ORDER BY s.name, f.name
```

### 获取函数参数和返回值
```sql
SELECT 
    s.name as SchemaName,
    f.name as FunctionName,
    pm.name as ParameterName,
    pm.parameter_id as ParameterId,
    t.name as DataType,
    pm.max_length as MaxLength,
    pm.precision as Precision,
    pm.scale as Scale,
    CASE 
        WHEN pm.parameter_id = 0 THEN 'RETURN'
        ELSE 'INPUT'
    END as ParameterType
FROM sys.objects f
JOIN sys.schemas s ON f.schema_id = s.schema_id
JOIN sys.parameters pm ON f.object_id = pm.object_id
JOIN sys.types t ON pm.user_type_id = t.user_type_id
WHERE f.type IN ('FN', 'IF', 'TF')
ORDER BY s.name, f.name, pm.parameter_id
```

## 约束查询

### 获取检查约束
```sql
SELECT 
    cc.TABLE_SCHEMA as SchemaName,
    cc.TABLE_NAME as TableName,
    cc.CONSTRAINT_NAME as ConstraintName,
    cc.CHECK_CLAUSE as CheckClause
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
ORDER BY cc.TABLE_SCHEMA, cc.TABLE_NAME, cc.CONSTRAINT_NAME
```

### 获取默认约束
```sql
SELECT 
    s.name as SchemaName,
    t.name as TableName,
    c.name as ColumnName,
    dc.name as ConstraintName,
    dc.definition as DefaultValue
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
JOIN sys.tables t ON dc.parent_object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
ORDER BY s.name, t.name, c.name
```

## 触发器查询

### 获取触发器信息
```sql
SELECT 
    s.name as SchemaName,
    t.name as TableName,
    tr.name as TriggerName,
    tr.type_desc as TriggerType,
    tr.create_date as CreateDate,
    tr.modify_date as ModifyDate,
    te.type_desc as EventType,
    m.definition as Definition
FROM sys.triggers tr
JOIN sys.tables t ON tr.parent_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
JOIN sys.trigger_events te ON tr.object_id = te.object_id
LEFT JOIN sys.sql_modules m ON tr.object_id = m.object_id
ORDER BY s.name, t.name, tr.name
```

## 使用说明

1. **参数化查询**：使用 `@TableName`, `@SchemaName` 等参数来获取特定对象的信息
2. **权限要求**：需要对目标数据库有 `VIEW DEFINITION` 权限
3. **性能优化**：对于大型数据库，建议添加适当的 WHERE 条件来限制结果集
4. **兼容性**：这些查询适用于 SQL Server 2012 及以上版本

## 注意事项

- 某些系统视图可能在不同版本的 SQL Server 中有所差异
- 建议在实际使用前测试这些查询在目标环境中的兼容性
- 对于加密的存储过程和函数，definition 字段可能为 NULL