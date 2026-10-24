import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import styles from './index.module.css';
import { useQuestEditorStore } from '../../store';

function QuestFlowNode(props: NodeProps) {
	const nodeTypes = useQuestEditorStore(state => state.nodeTypes);
	const data = props.data as Record<string, unknown>;
	const nodeType = String(data.nodeType || 'notify');
	const meta = nodeTypes.find(t => t.type === nodeType);
	const title = meta ? meta.title : nodeType;
	const outputs = meta && meta.outputs.length ? meta.outputs : [];

	return (
		<div className={styles.node + (props.selected ? ' ' + styles.selected : '')}>
			<Handle type="target" position={Position.Left} id="exec" className={styles.handle} />
			<div className={styles.title}>{title}</div>
			<div className={styles.type}>{nodeType}</div>
			{outputs.map(function (id, index) {
				const top =
					outputs.length === 1
						? '50%'
						: 18 + index * (64 / (outputs.length - 1)) + '%';
				return (
					<Handle
						key={id}
						type="source"
						position={Position.Right}
						id={id}
						className={handleClass(id)}
						style={{ top: top }}
					/>
				);
			})}
		</div>
	);
}

function handleClass(id: string) {
	if (id === 'true' || id === 'ok' || id === 'c1') return styles.handleTrue;
	if (id === 'false' || id === 'fail') return styles.handleFalse;
	if (id === 'c2' || id === 'c3') return styles.handleExec;
	return styles.handleExec;
}

export default memo(QuestFlowNode);
