import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Table,
  Typography,
  Space,
  Button,
  Tag,
  Statistic,
  Row,
  Col,
  Alert,
  Modal,
  Select,
  message,
  Tooltip,
  Empty,
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  EyeOutlined,
  TableOutlined,
  DatabaseOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { ComparisonResult, Report } from '../types';
import { compareApi, reportsApi } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface ComparisonResultsProps {
  taskId: string;
  result: ComparisonResult;
}

const ComparisonResults: React.FC<ComparisonResultsProps> = ({
  taskId,
  result,
}) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [detailData, setDetailData] = useState<any>({});
  const [loading, setLoading] = useState<any>({});
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<'html' | 'excel' | 'json'>('html');

  // 计算差异数量的辅助函数
  const calculateDifferenceCount = (diff: any) => {
    if (!diff) return 0;
    
    // 如果是数字，直接返回
    if (typeof diff === 'number') return diff;
    
    // 如果是对象结构 {added: [], removed: [], modified: []}
    if (diff.added && diff.removed && diff.modified) {
      return diff.added.length + diff.removed.length + diff.modified.length;
    }
    
    // 如果是数组，返回长度
    if (Array.isArray(diff)) return diff.length;
    
    return 0;
  };

  // 差异类型配置
  const differenceTypes = [
    { key: 'tables', title: '表结构', icon: <TableOutlined />, count: calculateDifferenceCount(result.differences?.tables) },
    { key: 'indexes', title: '索引', icon: <TableOutlined />, count: calculateDifferenceCount(result.differences?.indexes) },
    { key: 'views', title: '视图', icon: <EyeOutlined />, count: calculateDifferenceCount(result.differences?.views) },
    { key: 'procedures', title: '存储过程', icon: <DatabaseOutlined />, count: calculateDifferenceCount(result.differences?.procedures) },
    { key: 'functions', title: '函数', icon: <DatabaseOutlined />, count: calculateDifferenceCount(result.differences?.functions) },
  ];

  // 添加详细的差异统计
  const getDetailedDifferenceInfo = (diff: any) => {
    if (!diff) return { added: 0, removed: 0, modified: 0 };
    
    // 如果是数字，无法确定具体类型
    if (typeof diff === 'number') return { total: diff, added: 0, removed: 0, modified: 0 };
    
    // 如果是对象结构 {added: [], removed: [], modified: []}
    if (diff.added && diff.removed && diff.modified) {
      return {
        added: diff.added.length,
        removed: diff.removed.length,
        modified: diff.modified.length
      };
    }
    
    return { added: 0, removed: 0, modified: 0 };
  };

  // 添加调试日志
  console.log(`🔍 [差异显示] 比较结果数据结构:`, result.differences);
  differenceTypes.forEach(type => {
    const diff = result.differences?.[type.key as keyof typeof result.differences];
    const details = getDetailedDifferenceInfo(diff);
    console.log(`📊 [差异显示] ${type.title}: 总计${type.count}个差异`, details);
  });

  // 获取详细差异数据
  const fetchDetailData = async (type: string) => {
    if (detailData[type]) return; // 已经加载过

    setLoading((prev: any) => ({ ...prev, [type]: true }));
    try {
      const response = await compareApi.getDifferences(taskId, type as any);
      if (response.success) {
        setDetailData((prev: any) => ({
          ...prev,
          [type]: response.data || []
        }));
      }
    } catch (error) {
      message.error(`获取${type}详细数据失败`);
    } finally {
      setLoading((prev: any) => ({ ...prev, [type]: false }));
    }
  };

  // 生成报告
  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      console.log(`🚀 [报告生成] 开始生成${selectedFormat.toUpperCase()}格式报告，任务ID: ${taskId}`);
      const response = await reportsApi.generateReport(taskId, selectedFormat);
      
      if (response.success) {
        console.log(`✅ [报告生成] 报告生成成功:`, response.data?.report);
        message.success(`${selectedFormat.toUpperCase()}报告生成成功！正在刷新报告列表...`);
        setReportModalVisible(false);
        
        // 延迟一下再刷新，确保文件系统操作完成
        setTimeout(() => {
          setActiveTab('reports'); // 自动切换到报告链接Tab
          fetchReports(); // 刷新报告列表
        }, 1000);
      } else {
        console.error(`❌ [报告生成] 服务器返回错误:`, response.error);
        message.error(response.error || '报告生成失败');
      }
    } catch (error: any) {
      console.error('❌ [报告生成] 生成报告失败:', error);
      message.error(`生成报告失败: ${error.message || '未知错误'}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  // 获取报告列表
  const fetchReports = async () => {
    try {
      console.log(`🔍 [报告列表] 开始获取报告列表，任务ID: ${taskId}`);
      console.log(`🌐 [报告列表] 调用API: /api/reports/list`);
      
      const response = await reportsApi.getReports();
      console.log(`📡 [报告列表] API响应:`, response);
      
      if (response.success) {
        console.log(`📋 [报告列表] 服务器返回 ${response.reports?.length || 0} 个报告`);
        console.log(`🔍 [报告列表] 完整响应数据:`, response);
        console.log(`🔍 [报告列表] response.reports:`, response.reports);
        console.log(`🔍 [报告列表] 数据类型检查 - response.reports是数组吗?`, Array.isArray(response.reports));
        
        // 修复：API直接返回reports字段，不在data里
        const allReports = (response as any).reports || [];
        console.log(`📊 [报告列表] allReports长度:`, allReports.length);
        console.log(`📊 [报告列表] allReports内容:`, allReports);
        console.log(`🔍 [报告列表] 当前任务ID: ${taskId}`);
        console.log(`📋 [报告列表] 所有报告:`, allReports);
        
        // 过滤出当前任务的报告和无任务ID的旧格式报告
        const taskReports = allReports.filter((report: Report) => {
          // 匹配当前任务ID的报告，或者是旧格式无taskId的报告
          const matchesTaskId = report.taskId === taskId;
          const isLegacyFormat = !report.taskId && report.fileName.startsWith('database-comparison_');
          
          console.log(`📄 [报告列表] 检查报告: ${report.fileName}, taskId: ${report.taskId}, 当前taskId: ${taskId}, 匹配: ${matchesTaskId}, 旧格式: ${isLegacyFormat}`);
          
          return matchesTaskId || isLegacyFormat;
        });
        
        console.log(`✅ [报告列表] 过滤后获得 ${taskReports.length} 个相关报告`);
        
        // 临时显示所有报告，不进行过滤
        console.log(`⚠️ [临时调试] 显示所有 ${allReports.length} 个报告`);
        console.log(`🔄 [报告列表] 调用setReports前，当前reports.length:`, reports.length);
        setReports(allReports);
        console.log(`🎯 [报告列表] setReports完成，传入的数据长度:`, allReports.length);
        
        // 验证状态是否更新（异步）
        setTimeout(() => {
          console.log(`🔍 [报告列表] 1秒后检查状态，当前reports.length:`, reports.length);
        }, 1000);
      } else {
        console.error(`❌ [报告列表] API返回失败`);
      }
    } catch (error: any) {
      console.error('❌ [报告列表] 获取报告列表失败:', error);
      console.error('❌ [报告列表] 错误详情:', error.response?.data);
    }
  };

  // 复制链接到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('链接已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // 打开报告链接
  const openReportLink = (url: string) => {
    window.open(url, '_blank');
  };

  // 组件挂载时获取报告列表
  useEffect(() => {
    fetchReports();
  }, [taskId]);

  // 处理Tab切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key !== 'summary' && key !== 'reports') {
      fetchDetailData(key);
    }
  };

  // 获取差异类型的表格列配置
  const getTableColumns = (_type: string) => {
    const baseColumns = [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: '操作类型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => {
          const colors: any = {
            'added': 'green',
            'removed': 'red',
            'modified': 'orange',
          };
          return <Tag color={colors[type] || 'blue'}>{type}</Tag>;
        },
      },
      {
        title: '说明',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
    ];

    return baseColumns;
  };

  // 构建Tabs的items配置
  const tabsItems = [
    // 摘要Tab
    {
      key: 'summary',
      label: '摘要',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 统计信息 */}
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small">
                <Statistic
                  title="源数据库"
                  value={result.summary?.sourceDatabase || '未知'}
                  prefix={<DatabaseOutlined />}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small">
                <Statistic
                  title="目标数据库"
                  value={result.summary?.targetDatabase || '未知'}
                  prefix={<DatabaseOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="总差异数"
                  value={result.summary?.totalDifferences || 0}
                  valueStyle={{ color: (result.summary?.totalDifferences || 0) > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="比较时间"
                  value={result.summary?.comparedAt ? new Date(result.summary.comparedAt).toLocaleString() : '未知'}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="任务ID"
                  value={taskId.substring(0, 8)}
                  suffix="..."
                />
              </Card>
            </Col>
          </Row>

          {/* 差异分布 */}
          <Card title="差异分布" size="small">
            <Row gutter={[16, 16]}>
              {differenceTypes.map(type => {
                const diff = result.differences?.[type.key as keyof typeof result.differences];
                const details = getDetailedDifferenceInfo(diff);
                const hasDetails = details.added !== undefined;
                
                return (
                  <Col span={12} md={8} lg={6} key={type.key}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Space direction="vertical" size="small">
                        {type.icon}
                        <Text strong>{type.title}</Text>
                        
                        {Number(type.count) === 0 ? (
                          <Tag color="green">无差异</Tag>
                        ) : hasDetails ? (
                          <Space direction="vertical" size={2}>
                            <Tag color="orange">总计 {String(type.count)} 个差异</Tag>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              {details.added > 0 && <div>✅ 新增: {details.added}</div>}
                              {details.removed > 0 && <div>❌ 删除: {details.removed}</div>}
                              {details.modified > 0 && <div>🔄 修改: {details.modified}</div>}
                            </div>
                          </Space>
                        ) : (
                          <Tag color="red">{String(type.count)} 个差异</Tag>
                        )}
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Card>

          {(result.summary?.totalDifferences || 0) === 0 && (
            <Alert
              message="数据库结构一致"
              description="源数据库和目标数据库的结构完全一致，没有发现任何差异。"
              type="success"
              showIcon
            />
          )}
        </Space>
      )
    },
    // 详细差异Tabs
    ...differenceTypes.map(type => ({
      key: type.key,
      label: (
        <Space>
          {type.icon}
          {type.title}
          <Tag>{String(type.count)}</Tag>
        </Space>
      ),
      children: (
        Number(type.count) === 0 ? (
          <Empty 
            description={`没有${type.title}差异`}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            dataSource={detailData[type.key] || []}
            columns={getTableColumns(type.key)}
            loading={loading[type.key]}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: true }}
          />
        )
      )
    })),
    // 报告Tab
    {
      key: 'reports',
      label: '报告链接',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="报告链接说明"
            description="生成的报告文件包含完整的比较结果，您可以下载或直接在浏览器中查看。支持HTML、Excel和JSON格式。"
            type="info"
            showIcon
          />

          {(() => {
            console.log(`🎨 [渲染] 报告Tab渲染，当前reports.length: ${reports.length}, reports:`, reports);
            return reports.length === 0;
          })() ? (
            <Empty 
              description="暂无报告文件"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => setReportModalVisible(true)}
              >
                生成第一个报告
              </Button>
            </Empty>
          ) : (
            <Table
              dataSource={reports}
              columns={[
                {
                  title: '文件名',
                  dataIndex: 'fileName',
                  key: 'fileName',
                  render: (text: string) => <Text code>{text}</Text>,
                },
                {
                  title: '格式',
                  dataIndex: 'format',
                  key: 'format',
                  render: (format: string) => (
                    <Tag color={format === 'html' ? 'blue' : format === 'excel' ? 'green' : 'orange'}>
                      {format.toUpperCase()}
                    </Tag>
                  ),
                },
                {
                  title: '大小',
                  dataIndex: 'size',
                  key: 'size',
                  render: (size: number) => `${(size / 1024).toFixed(1)} KB`,
                },
                {
                  title: '创建时间',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  render: (time: string) => new Date(time).toLocaleString(),
                },
                {
                  title: '操作',
                  key: 'actions',
                  render: (_, record: Report) => (
                    <Space>
                      <Tooltip title="在新窗口打开">
                        <Button
                          type="primary"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => openReportLink(record.viewUrl || record.downloadUrl)}
                        >
                          查看
                        </Button>
                      </Tooltip>
                      <Tooltip title="复制链接地址">
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyToClipboard(record.viewUrl || record.downloadUrl)}
                        >
                          复制链接
                        </Button>
                      </Tooltip>
                      <Tooltip title="下载文件">
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = record.downloadUrl;
                            link.download = record.fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          下载
                        </Button>
                      </Tooltip>
                    </Space>
                  ),
                },
              ]}
              pagination={false}
              size="small"
            />
          )}
        </Space>
      )
    }
  ];

  return (
    <Card
      title={
        <Space>
          <FileTextOutlined />
          <Title level={4} style={{ margin: 0 }}>
            比较结果
          </Title>
        </Space>
      }
      extra={
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => setReportModalVisible(true)}
          >
            生成报告
          </Button>
        </Space>
      }
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange}
        items={tabsItems}
      />

      {/* 生成报告弹窗 */}
      <Modal
        title="生成比较报告"
        open={reportModalVisible}
        onOk={generateReport}
        onCancel={() => setReportModalVisible(false)}
        confirmLoading={generatingReport}
        okText="生成报告"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>选择报告格式：</Text>
          <Select
            value={selectedFormat}
            onChange={setSelectedFormat}
            style={{ width: '100%' }}
            size="large"
          >
            <Option value="html">
              <Space>
                <FileTextOutlined />
                HTML 格式 - 适合在线查看
              </Space>
            </Option>
            <Option value="excel">
              <Space>
                <TableOutlined />
                Excel 格式 - 适合数据分析
              </Space>
            </Option>
            <Option value="json">
              <Space>
                <DatabaseOutlined />
                JSON 格式 - 适合程序处理
              </Space>
            </Option>
          </Select>
          <Alert
            message="报告内容说明"
            description="报告将包含完整的数据库比较结果，包括所有差异的详细信息、统计数据和比较摘要。"
            type="info"
            showIcon
          />
        </Space>
      </Modal>
    </Card>
  );
};

export default ComparisonResults;