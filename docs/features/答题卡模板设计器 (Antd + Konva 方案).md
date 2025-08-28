import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import {
Upload, Button, Layout, Menu, Tooltip, Slider, Input, Select,
Typography, Divider, Space, Dropdown, message
} from 'antd';
import {
UploadOutlined, FolderOpenOutlined, SaveOutlined, ZoomInOutlined, ZoomOutOutlined,
ScanOutlined, QrcodeOutlined, CheckSquareOutlined, EditOutlined, DeleteOutlined,
AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined,
VerticalAlignTopOutlined, VerticalAlignMiddleOutlined, VerticalAlignBottomOutlined
} from '@ant-design/icons';
import create from 'zustand';
import Konva from 'konva';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

// 1. Zustand Store for State Management
const useDesignerStore = create((set) =\> ({
regions: \[\],
selectedRegionId: null,
backgroundImage: null,
canvasSize: { width: 800, height: 1120 },
templateInfo: { name: '未命名模板', subject: '通用' },
addRegion: (region) =\> set((state) =\> ({ regions: \[...state.regions, region\] })),
updateRegion: (id, attrs) =\> set((state) =\> ({
regions: state.regions.map(r =\> r.id === id ? { ...r, ...attrs } : r)
})),
deleteRegion: (id) =\> set((state) =\> ({
regions: state.regions.filter(r =\> r.id !== id),
selectedRegionId: state.selectedRegionId === id ? null : state.selectedRegionId
})),
setSelectedRegionId: (id) =\> set({ selectedRegionId: id }),
setBackgroundImage: (image) =\> set({ backgroundImage: image }),
setTemplateInfo: (info) =\> set((state) =\> ({ templateInfo: { ...state.templateInfo, ...info } })),
}));

// 2. Konva Component for Regions
const RegionShape = ({ shapeProps, isSelected, onSelect, onChange }) =\> {
const shapeRef = useRef();
const trRef = useRef();

    useEffect(() => {
        if (isSelected) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    const typeColors = {
        positioning: '#f5222d',
        barcode: '#722ed1',
        objective: '#1890ff',
        subjective: '#52c41a',
    };

    return (
        <>
            <Rect
                onClick={onSelect}
                onTap={onSelect}
                ref={shapeRef}
                {...shapeProps}
                draggable
                onDragEnd={(e) => {
                    onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
                }}
                onTransformEnd={(e) => {
                    const node = shapeRef.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    onChange({
                        ...shapeProps,
                        x: node.x(),
                        y: node.y(),
                        width: Math.max(5, node.width() * scaleX),
                        height: Math.max(5, node.height() * scaleY),
                    });
                }}
                stroke={typeColors[shapeProps.type]}
                strokeWidth={2}
                fill={`${typeColors[shapeProps.type]}20`}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </>
    );

};

// Main App Component
const App = () =\> {
const {
regions, selectedRegionId, backgroundImage, canvasSize, templateInfo,
addRegion, updateRegion, deleteRegion, setSelectedRegionId, setBackgroundImage, setTemplateInfo
} = useDesignerStore();

    const [stage, setStage] = useState({ scale: 0.5, x: 0, y: 0 });
    const stageRef = useRef(null);

    const selectedRegion = regions.find(r => r.id === selectedRegionId);

    const handleWheel = (e) => {
        e.evt.preventDefault();
        const scaleBy = 1.05;
        const stage = stageRef.current;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        const finalScale = Math.max(0.25, Math.min(newScale, 4));

        setStage({
            scale: finalScale,
            x: pointer.x - mousePointTo.x * finalScale,
            y: pointer.y - mousePointTo.y * finalScale,
        });
    };

    const handleContextMenu = (e) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        const pos = stage.getPointerPosition();
        const items = [
            { key: 'positioning', label: '添加定位点', icon: <ScanOutlined /> },
            { key: 'barcode', label: '添加条码区', icon: <QrcodeOutlined /> },
            { key: 'objective', label: '添加客观题区', icon: <CheckSquareOutlined /> },
            { key: 'subjective', label: '添加主观题区', icon: <EditOutlined /> },
        ];
        
        const onMenuClick = ({ key }) => {
            const newRegion = {
                id: `region-${Date.now()}`,
                type: key,
                x: (pos.x - stage.x()) / stage.scaleX(),
                y: (pos.y - stage.y()) / stage.scaleY(),
                width: 100,
                height: 50,
                properties: key === 'objective' ? { startQ: 1, totalQ: 10, options: 4, perRow: 5, points: 2, layout: 'horizontal' } : { questionId: '', fullMarks: 10 }
            };
            addRegion(newRegion);
            setSelectedRegionId(newRegion.id);
        };

        // Use Ant Design's Dropdown to show context menu
        const menu = <Menu onClick={onMenuClick} items={items} />;
        Dropdown.prototype.render = function() {
            return <div style={{ position: 'fixed', top: e.evt.clientY, left: e.evt.clientX }}>{menu}</div>
        }
        const dropdown = new Dropdown({ overlay: menu });
        dropdown.render();
    };

    const checkDeselect = (e) => {
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.hasName('bg-image');
        if (clickedOnEmpty) {
            setSelectedRegionId(null);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedRegionId) {
                    deleteRegion(selectedRegionId);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedRegionId, deleteRegion]);

    return (
        <Layout style={{ height: '100vh' }}>
            <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>专业级答题卡模板设计器</Title>
                <Space>
                    <Button icon={<FolderOpenOutlined />}>加载</Button>
                    <Button type="primary" icon={<SaveOutlined />}>保存</Button>
                </Space>
            </Header>
            <Layout>
                <Content style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1 }}>
                        <Slider
                            vertical
                            min={25}
                            max={400}
                            step={5}
                            value={Math.round(stage.scale * 100)}
                            onChange={(val) => setStage(s => ({...s, scale: val / 100}))}
                            style={{ height: 150 }}
                        />
                    </div>
                    <div style={{ width: '100%', height: '100%', background: '#f0f2f5' }} onContextMenu={(e) => e.preventDefault()}>
                        <Stage
                            width={window.innerWidth - 320}
                            height={window.innerHeight - 64}
                            onWheel={handleWheel}
                            onMouseDown={checkDeselect}
                            onContextMenu={handleContextMenu}
                            ref={stageRef}
                            scaleX={stage.scale}
                            scaleY={stage.scale}
                            x={stage.x}
                            y={stage.y}
                        >
                            <Layer>
                                <Rect width={canvasSize.width} height={canvasSize.height} fill="#fff" shadowBlur={10} name="bg-image" />
                                {backgroundImage && <KonvaImage image={backgroundImage} width={canvasSize.width} height={canvasSize.height} name="bg-image" />}
                                {regions.map((region) => (
                                    <RegionShape
                                        key={region.id}
                                        shapeProps={region}
                                        isSelected={region.id === selectedRegionId}
                                        onSelect={() => setSelectedRegionId(region.id)}
                                        onChange={(newAttrs) => updateRegion(region.id, newAttrs)}
                                    />
                                ))}
                            </Layer>
                        </Stage>
                    </div>
                </Content>
                <Sider width={320} theme="light" style={{ padding: 16, borderLeft: '1px solid #f0f0f0', overflowY: 'auto' }}>
                    <Title level={5}>属性配置</Title>
                    <Divider />
                    {selectedRegion ? (
                        <div>
                            <Text strong>ID: {selectedRegion.id.slice(-6)}</Text>
                            {selectedRegion.type === 'subjective' && (
                                <div className="space-y-2 mt-2">
                                    <Text>题目编号:</Text>
                                    <Input value={selectedRegion.properties.questionId} onChange={e => updateRegion(selectedRegionId, { properties: { ...selectedRegion.properties, questionId: e.target.value } })} />
                                    <Text>满分值:</Text>
                                    <Input type="number" value={selectedRegion.properties.fullMarks} onChange={e => updateRegion(selectedRegionId, { properties: { ...selectedRegion.properties, fullMarks: parseInt(e.target.value) || 0 } })} />
                                </div>
                            )}
                             {selectedRegion.type === 'objective' && (
                                <div className="space-y-2 mt-2">
                                    <Text>起始题号:</Text>
                                    <Input type="number" value={selectedRegion.properties.startQ} onChange={e => updateRegion(selectedRegionId, { properties: { ...selectedRegion.properties, startQ: parseInt(e.target.value) || 1 } })} />
                                    <Text>题目总数:</Text>
                                    <Input type="number" value={selectedRegion.properties.totalQ} onChange={e => updateRegion(selectedRegionId, { properties: { ...selectedRegion.properties, totalQ: parseInt(e.target.value) || 1 } })} />
                                    {/* More objective properties... */}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <Text strong>模板信息</Text>
                            <div className="space-y-2 mt-2">
                                <Text>模板名称:</Text>
                                <Input value={templateInfo.name} onChange={e => setTemplateInfo({ name: e.target.value })} />
                                <Text>科目:</Text>
                                <Input value={templateInfo.subject} onChange={e => setTemplateInfo({ subject: e.target.value })} />
                                <Upload
                                    beforeUpload={file => {
                                        const reader = new FileReader();
                                        reader.onload = e => {
                                            const img = new window.Image();
                                            img.src = e.target.result;
                                            img.onload = () => setBackgroundImage(img);
                                        };
                                        reader.readAsDataURL(file);
                                        return false;
                                    }}
                                    showUploadList={false}
                                >
                                    <Button icon={<UploadOutlined />} style={{ width: '100%', marginTop: 8 }}>上传底图</Button>
                                </Upload>
                            </div>
                        </div>
                    )}
                    <Divider />
                    <Title level={5}>图层列表</Title>
                     {regions.map(r => (
                        <div key={r.id} onClick={() => setSelectedRegionId(r.id)} 
                             style={{ padding: 8, background: r.id === selectedRegionId ? '#e6f7ff' : 'transparent', borderRadius: 4, cursor: 'pointer' }}>
                            {r.type} #{r.id.slice(-6)}
                        </div>
                    ))}
                </Sider>
            </Layout>
        </Layout>
    );

};

export default App;
