import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { interpolate } from "../../utils";
import styles from "./LineChart.module.css";

export interface ILineChartProps {
    data: {
        dateTime: string;
        close: number;
    }[];
}

export function LineChart(props: ILineChartProps) {
    const ref = useRef<SVGSVGElement>();
    const [isMoving, setMoving] = useState(false);
    const [xClient, setXClient] = useState(0);
    const [xOffset, setXOffset] = useState(0);

    useEffect(() => {
        setXOffset(0);
    }, [props.data]);

    const { dataWithX, xMin } = useMemo(() => {
        const dataWithX = [...props.data].reverse().map((i, index) => ({
            ...i,
            x: 875 - index * 20,
        })).reverse();
        return {
            dataWithX,
            xMin: dataWithX.length ? dataWithX[0].x : 0,
        };
    }, [props.data]);

    const { dataWithXOffset, valueMin, valueMax } = useMemo(() => {
        const dataWithXOffset = dataWithX.map(i => ({
            ...i,
            x: i.x - xOffset,
        }));
        const values = dataWithXOffset
            .filter(i => i.x >= 125 && i.x <= 875)
            .map(i => i.close);
        return {
            dataWithXOffset,
            valueMin: Math.min(...values),
            valueMax: Math.max(...values),
        };
    }, [xOffset, dataWithX]);

    const yAxis = useMemo(() => {
        const yAxis: JSX.Element[] = [];

        if (!dataWithXOffset.length) {
            return yAxis;
        }

        const { close } = dataWithXOffset[dataWithXOffset.length - 1];

        if (close < valueMin) {
            yAxis.push(<text key="yAxis-close" x={1000} y={425} fill="#F26126" alignmentBaseline="middle" textAnchor="end">{close} &#8381;</text>);
        } else if (close > valueMax) {
            yAxis.push(<text key="yAxis-close" x={1000} y={25} fill="#F26126" alignmentBaseline="middle" textAnchor="end">{close} &#8381;</text>);
        } else {
            const y = interpolate(close, [valueMin, valueMax], [425, 25]) || 25;
            yAxis.push(
                <React.Fragment key="yAxis-close">
                    <line x1={100} y1={y} x2={900} y2={y} strokeDasharray="10 5" stroke="#F26126" />
                    <text x={1000} y={y} fill="#F26126" alignmentBaseline="middle" textAnchor="end">{close} &#8381;</text>
                </React.Fragment>
            );
        }

        const interval = (valueMax - valueMin) / 4;

        for (let i = 0; i < 5; i++) {
            const value = (valueMax - i * interval).toFixed(6);
            const y = i * 100 + 25;
            yAxis.push(
                <React.Fragment key={`yAxis-${value}`}>
                    <line x1={100} y1={y} x2={900} y2={y} stroke="#F7F7F8" />
                    <text x={0} y={y} fill="#9393A1" alignmentBaseline="middle">{value} &#8381;</text>
                </React.Fragment>
            );
        }

        return yAxis;
    }, [dataWithXOffset, valueMin, valueMax]);

    const { xAxis, line } = useMemo(() => {
        const xAxis: JSX.Element[] = [];
        const linePoints: string[] = [];
        let datePrev = '';
        let xPrev = dataWithXOffset.length ? dataWithXOffset[0].x : 0;

        dataWithXOffset.forEach(i => {
            const date = new Date(i.dateTime).toLocaleDateString();

            if (datePrev !== date) {
                datePrev = date;

                if (i.x >= 125 && i.x <= 875 && (i.x - xPrev >= 100 || i.x - xPrev === 0)) {
                    xPrev = i.x;
                    xAxis.push(
                        <React.Fragment key={`xAxis-${date}`}>
                            <line x1={i.x} y1={0} x2={i.x} y2={450} stroke="#F7F7F8" />
                            <text x={i.x} y={475} fill="#9393A1" alignmentBaseline="middle" textAnchor="middle">{date}</text>
                        </React.Fragment>
                    );
                }
            }

            if (i.x >= 125 && i.x <= 875) {
                const close = interpolate(i.close, [valueMin, valueMax], [425, 25]);
                linePoints.push(`${i.x},${close}`);
            }
        });

        return {
            xAxis,
            line: <polyline points={linePoints.join(' ')} strokeWidth={2} stroke="#5AA9F9" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
        };
    }, [dataWithXOffset]);

    const tooltip = useMemo(() => {
        if (!ref.current || isMoving) {
            return null;
        }

        const boundingClientRect = ref.current.getBoundingClientRect();
        let item: any;
        const x = (xClient - boundingClientRect.x) / boundingClientRect.width * 1000;
        let intervalPrev = Number.MAX_SAFE_INTEGER;

        dataWithXOffset.forEach(i => {
            const interval = Math.abs(i.x - x);

            if (interval <= 10 && interval < intervalPrev) {
                intervalPrev = interval;
                item = i;
            }
        });

        if (!item || (item.x < 125 || item.x > 875)) {
            return null;
        }

        const yCircle = interpolate(item.close, [valueMin, valueMax], [425, 25]);
        const xRect = item.x >= 500 ? item.x - 320 : item.x + 20;
        const yRect = yCircle <= 25 ? 25 : yCircle >= 375 ? 375 : yCircle - 25;
        const dateTime = new Date(item.dateTime);

        return (
            <>
                <line x1={item.x} y1={0} x2={item.x} y2={450} stroke="#9393A1" />
                <circle cx={item.x} cy={yCircle} r={5} fill="#9393A1" />
                <rect x={xRect} y={yRect} width={300} height={50} fill="#FFFFFF" stroke="#9393A1" />
                <text x={xRect + 10} y={yRect + 20} fill="#646478" fontWeight="bold">Закрытие</text>
                <text x={xRect + 290} y={yRect + 20} fill="#646478" textAnchor="end">{item.close} &#8381;</text>
                <text x={xRect + 10} y={yRect + 40} fill="#646478" fontWeight="bold">Дата</text>
                <text x={xRect + 290} y={yRect + 40} fill="#646478" textAnchor="end">{dateTime.toLocaleDateString()}, {dateTime.toLocaleTimeString()}</text>
            </>
        );
    }, [isMoving, xClient, dataWithXOffset]);

    const handleStart = useCallback(e => {
        setMoving(true);
        setXClient(e.nativeEvent.touches?.[0].clientX ?? e.nativeEvent.clientX);
    }, []);

    const handleMove = useCallback(e => {
        const xClientTemp = e.nativeEvent.touches?.[0].clientX ?? e.nativeEvent.clientX;

        if (isMoving) {
            setXOffset(xOffsetPrev => {
                const xOffsetTemp = xOffsetPrev + xClient - xClientTemp;
                return xOffsetTemp <= xMin - 125 ? xMin - 125 : xOffsetTemp >= 0 ? 0 : xOffsetTemp;
            });
        }

        setXClient(xClientTemp);
    }, [xClient, xMin]);

    const handleFinish = useCallback(() => setMoving(false), []);

    return (
        <svg
            className={styles.lineChart}
            viewBox="0 0 1000 500"
            ref={ref as any}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleFinish}
            onMouseLeave={handleFinish}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleFinish}
        >
            {xAxis}
            {yAxis}
            {line}
            {tooltip}
        </svg>
    );
}
