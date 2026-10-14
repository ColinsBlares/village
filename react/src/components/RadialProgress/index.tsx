import React, { memo, useRef } from 'react';
import styles from './index.module.css';

export type RadialCap = 'butt' | 'round' | 'square';

export type RadialPaint =
	| string
	| string[]
	| {
			stops: string[];
			/** Куда смотрит градиент: 0 — вверх, дальше по часовой. */
			angle?: number;
	  };

export interface RadialArc {
	value?: number;
	min?: number;
	max?: number;
	/** Градусы от верхней точки. По часовой, если clockwise не выключен. */
	startAngle?: number;
	/** Длина дорожки в градусах. 360 — полное кольцо. */
	sweep?: number;
	clockwise?: boolean;
	/**
	 * Радиус средней линии в системе 0–100.
	 * Блок сжимается по внешнему краю штриха, пустого поля вокруг кольца нет.
	 * size — это размер полной системы 100.
	 */
	radius?: number;
	strokeWidth?: number;
	trackWidth?: number;
	color?: RadialPaint;
	trackColor?: RadialPaint;
	cap?: RadialCap;
	/** Сила свечения в единицах viewBox. true — стандартное. */
	glow?: number | boolean;
	/** Откуда растёт заливка. startAngle, если задан, перекрывает это. */
	from?: 'left' | 'right' | 'top left' | 'top right';
}

export interface RadialProgressProps extends RadialArc {
	size?: number | string;
	className?: string;
	animate?: boolean;
	duration?: number;
	/** Несколько дуг в одном квадрате. Если задан, одиночные поля дуги не используются. */
	arcs?: RadialArc[];
	children?: React.ReactNode;
}

const CENTER = 50;

let nextUid = 0;

function useUid() {
	const ref = useRef('');

	if (!ref.current) {
		nextUid += 1;
		ref.current = 'radial-' + nextUid;
	}

	return ref.current;
}

function clamp(value: number, min: number, max: number) {
	if (value < min) {
		return min;
	}
	if (value > max) {
		return max;
	}
	return value;
}

function fmt(value: number) {
	return String(Math.round(value * 1000) / 1000);
}

function ratioOf(arc: RadialArc) {
	const min = arc.min == null ? 0 : arc.min;
	const max = arc.max == null ? 100 : arc.max;
	const value = arc.value == null ? 0 : arc.value;
	const span = max - min;

	if (!span || isNaN(value)) {
		return 0;
	}

	return clamp((value - min) / span, 0, 1);
}

function sweepOf(arc: RadialArc) {
	return clamp(arc.sweep == null ? 360 : arc.sweep, 0, 360);
}

function radiusOf(arc: RadialArc) {
	const stroke = arc.strokeWidth == null ? 8 : arc.strokeWidth;
	const track = arc.trackWidth == null ? stroke : arc.trackWidth;
	const width = Math.max(stroke, track);

	if (arc.radius != null) {
		return arc.radius;
	}

	return CENTER - width / 2;
}

function glowOf(glow: RadialArc['glow']) {
	if (glow === true) {
		return 1.8;
	}
	if (typeof glow === 'number' && glow > 0) {
		return glow;
	}
	return 0;
}

function hiddenPaint(paint: RadialPaint | undefined) {
	return paint === 'transparent' || paint === 'none';
}

interface ResolvedPaint {
	solid: string | null;
	stops: string[] | null;
	angle: number;
}

function resolvePaint(
	paint: RadialPaint | undefined,
	fallback: string,
): ResolvedPaint {
	if (paint == null) {
		return { solid: fallback, stops: null, angle: 0 };
	}

	if (typeof paint === 'string') {
		return { solid: paint, stops: null, angle: 0 };
	}

	if (Array.isArray(paint)) {
		if (paint.length < 2) {
			return { solid: paint[0] || fallback, stops: null, angle: 0 };
		}
		return { solid: null, stops: paint, angle: 120 };
	}

	if (!paint.stops || paint.stops.length < 2) {
		const single = paint.stops && paint.stops[0] ? paint.stops[0] : fallback;
		return { solid: single, stops: null, angle: 0 };
	}

	return {
		solid: null,
		stops: paint.stops,
		angle: paint.angle == null ? 120 : paint.angle,
	};
}

function point(radius: number, deg: number) {
	const rad = (deg * Math.PI) / 180;

	return {
		x: CENTER + radius * Math.sin(rad),
		y: CENTER - radius * Math.cos(rad),
	};
}

function startOf(arc: RadialArc) {
	if (arc.from === 'left') {
		return 270;
	}

	if (arc.from === 'right') {
		return 90;
	}

	if (arc.startAngle != null) {
		return arc.startAngle;
	}

	return 0;
}

function outerOf(arc: RadialArc) {
	const radius = radiusOf(arc);
	const stroke = arc.strokeWidth == null ? 8 : arc.strokeWidth;
	const track = arc.trackWidth == null ? stroke : arc.trackWidth;

	return radius + Math.max(stroke, track) / 2;
}

function arcPath(
	radius: number,
	start: number,
	sweep: number,
	clockwise: boolean,
) {
	const dir = clockwise ? 1 : -1;
	const flag = clockwise ? 1 : 0;

	if (sweep >= 359.99) {
		const a = point(radius, start);
		const b = point(radius, start + dir * 180);

		return (
			'M ' +
			fmt(a.x) +
			' ' +
			fmt(a.y) +
			' A ' +
			fmt(radius) +
			' ' +
			fmt(radius) +
			' 0 1 ' +
			flag +
			' ' +
			fmt(b.x) +
			' ' +
			fmt(b.y) +
			' A ' +
			fmt(radius) +
			' ' +
			fmt(radius) +
			' 0 1 ' +
			flag +
			' ' +
			fmt(a.x) +
			' ' +
			fmt(a.y)
		);
	}

	const from = point(radius, start);
	const to = point(radius, start + dir * sweep);
	const large = sweep > 180 ? 1 : 0;

	return (
		'M ' +
		fmt(from.x) +
		' ' +
		fmt(from.y) +
		' A ' +
		fmt(radius) +
		' ' +
		fmt(radius) +
		' 0 ' +
		large +
		' ' +
		flag +
		' ' +
		fmt(to.x) +
		' ' +
		fmt(to.y)
	);
}

function gradientLine(angle: number) {
	const rad = (angle * Math.PI) / 180;
	const x = Math.sin(rad);
	const y = -Math.cos(rad);

	return {
		x1: CENTER - x * CENTER,
		y1: CENTER - y * CENTER,
		x2: CENTER + x * CENTER,
		y2: CENTER + y * CENTER,
	};
}

interface PaintDef {
	id: string;
	stops: string[];
	angle: number;
}

function RadialProgress(props: RadialProgressProps) {
	const uid = useUid();
	const arcs = props.arcs && props.arcs.length ? props.arcs : [props];
	const animate = props.animate !== false;
	const duration = props.duration == null ? 450 : props.duration;
	const size = props.size == null ? 120 : props.size;
	let outer = 0;

	arcs.forEach(function (arc) {
		const edge = outerOf(arc);
		if (edge > outer) {
			outer = edge;
		}
	});

	if (outer <= 0) {
		outer = CENTER;
	}

	const span = outer * 2;
	const unit = span / 100;
	const sizeCss =
		typeof size === 'number'
			? size * unit + 'px'
			: 'calc((' + size + ') * ' + unit + ')';
	const viewBox =
		fmt(CENTER - outer) +
		' ' +
		fmt(CENTER - outer) +
		' ' +
		fmt(span) +
		' ' +
		fmt(span);
	const paints: PaintDef[] = [];
	const glows: { id: string; amount: number }[] = [];

	arcs.forEach(function (arc, index) {
		const color = resolvePaint(arc.color, '#ffffff');
		const track = resolvePaint(arc.trackColor, 'rgba(255, 255, 255, 0.16)');

		if (color.stops) {
			paints.push({
				id: uid + '-c' + index,
				stops: color.stops,
				angle: color.angle,
			});
		}

		if (track.stops) {
			paints.push({
				id: uid + '-t' + index,
				stops: track.stops,
				angle: track.angle,
			});
		}

		const glow = glowOf(arc.glow);
		if (glow > 0) {
			glows.push({ id: uid + '-g' + index, amount: glow });
		}
	});

	const rootClass = props.className
		? styles.root + ' ' + props.className
		: styles.root;
	const barClass = animate ? styles.bar : styles.bar + ' ' + styles.instant;
	const barStyle = animate
		? { transitionDuration: duration + 'ms' }
		: undefined;

	return (
		<div className={rootClass} style={{ width: sizeCss, height: sizeCss }}>
			<svg className={styles.svg} viewBox={viewBox}>
				<defs>
					{paints.map(function (paint) {
						const line = gradientLine(paint.angle);

						return (
							<linearGradient
								key={paint.id}
								id={paint.id}
								gradientUnits='userSpaceOnUse'
								x1={line.x1}
								y1={line.y1}
								x2={line.x2}
								y2={line.y2}
							>
								{paint.stops.map(function (stop, stopIndex) {
									const offset =
										paint.stops.length === 1
											? 0
											: stopIndex / (paint.stops.length - 1);

									return (
										<stop
											key={stopIndex}
											offset={offset * 100 + '%'}
											stopColor={stop}
										/>
									);
								})}
							</linearGradient>
						);
					})}
					{glows.map(function (glow) {
						const extent = glow.amount * 4;

						return (
							<filter
								key={glow.id}
								id={glow.id}
								filterUnits='userSpaceOnUse'
								x={-extent}
								y={-extent}
								width={100 + extent * 2}
								height={100 + extent * 2}
							>
								<feGaussianBlur stdDeviation={glow.amount} result='blur' />
								<feMerge>
									<feMergeNode in='blur' />
									<feMergeNode in='SourceGraphic' />
								</feMerge>
							</filter>
						);
					})}
				</defs>
				{arcs.map(function (arc, index) {
					const sweep = sweepOf(arc);
					const radius = radiusOf(arc);

					if (sweep <= 0 || radius <= 0) {
						return null;
					}

					const clockwise = arc.clockwise !== false;
					const start = startOf(arc);
					const stroke = arc.strokeWidth == null ? 8 : arc.strokeWidth;
					const trackWidth = arc.trackWidth == null ? stroke : arc.trackWidth;
					const cap = arc.cap == null ? 'round' : arc.cap;
					const d = arcPath(radius, start, sweep, clockwise);
					const ratio = ratioOf(arc);
					const filled = ratio * 1000;
					const color = resolvePaint(arc.color, '#ffffff');
					const track = resolvePaint(
						arc.trackColor,
						'rgba(255, 255, 255, 0.16)',
					);
					const colorPaint = color.stops
						? 'url(#' + uid + '-c' + index + ')'
						: color.solid;
					const trackPaint = track.stops
						? 'url(#' + uid + '-t' + index + ')'
						: track.solid;
					const glow = glowOf(arc.glow);
					const showTrack =
						trackWidth > 0 && !hiddenPaint(arc.trackColor) && trackPaint;

					return (
						<g key={index}>
							{showTrack ? (
								<path
									d={d}
									fill='none'
									stroke={trackPaint || undefined}
									strokeWidth={trackWidth}
									strokeLinecap={cap}
								/>
							) : null}
							{ratio > 0 && stroke > 0 && colorPaint ? (
								<path
									className={barClass}
									style={barStyle}
									d={d}
									fill='none'
									stroke={colorPaint}
									strokeWidth={stroke}
									strokeLinecap={cap}
									pathLength={1000}
									strokeDasharray={filled + ' 1000'}
									filter={
										glow > 0 ? 'url(#' + uid + '-g' + index + ')' : undefined
									}
								/>
							) : null}
						</g>
					);
				})}
			</svg>
			{props.children ? (
				<div className={styles.center}>{props.children}</div>
			) : null}
		</div>
	);
}

export default memo(RadialProgress);
