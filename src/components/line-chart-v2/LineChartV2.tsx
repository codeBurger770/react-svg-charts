import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { interpolate } from "../../utils";
import styles from "./LineChartV2.module.css";

export interface ILineChartV2Props {
    data: {
        dateTime: string;
        close: number;
    }[];
}

export function LineChartV2(props: ILineChartV2Props) {
    const ref = useRef<SVGSVGElement>();
    const [isMoving, setMoving] = useState(false);
    const [xClient, setXClient] = useState(0);
    const [xOffset, setXOffset] = useState(0);

    useEffect(() => {
        setXOffset(0);
    }, [props.data]);

    const { dataWithX, xMin } = useMemo(() => {
        const interval = props.data.length === 1 ? 0 : props.data.length > 38 ? 20 : 760 / (props.data.length - 1);
        const dataWithX = [...props.data].reverse().map((i, index) => ({
            ...i,
            x: 880 - index * interval,
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
            .filter(i => i.x >= 120 && i.x <= 880)
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

        const interval = (valueMax - valueMin) / 4;

        for (let i = 4; i >= (valueMin === valueMax ? 4 : 0); i--) {
            const value = +(valueMax - i * interval).toFixed(6);
            const y = i * 100 + 20;
            yAxis.push(
                <React.Fragment key={`yAxis-${value}`}>
                    <line x1={100} y1={y} x2={900} y2={y} stroke="#F7F7F8" />
                    <text x={0} y={y} fill="#9393A1" alignmentBaseline="middle">{value} &#8381;</text>
                </React.Fragment>
            );
        }

        const { close } = dataWithXOffset[dataWithXOffset.length - 1];

        if (close < valueMin) {
            yAxis.push(<text key="yAxis-close" x={1000} y={420} fill="#F26126" alignmentBaseline="middle" textAnchor="end">{close} &#8381;</text>);
        } else if (close > valueMax) {
            yAxis.push(<text key="yAxis-close" x={1000} y={20} fill="#F26126" alignmentBaseline="middle" textAnchor="end">{close} &#8381;</text>);
        } else {
            const y = valueMin === valueMax ? 420 : interpolate(close, [valueMin, valueMax], [420, 20]);
            yAxis.push(
                <React.Fragment key="yAxis-close">
                    <line x1={100} y1={y} x2={900} y2={y} strokeDasharray="10 5" stroke="#F26126" />
                    <text x={1000} y={y} fill="#F26126" alignmentBaseline="middle" textAnchor="end">{close} &#8381;</text>
                </React.Fragment>
            );
        }

        return yAxis;
    }, [dataWithXOffset, valueMin, valueMax]);

    const { xAxis, line } = useMemo(() => {
        const xAxis: JSX.Element[] = [];
        const line: JSX.Element[] = [];
        let datePrev = '';
        let xPrev = dataWithXOffset.length ? dataWithXOffset[0].x : 0;

        dataWithXOffset.forEach((i, index, array) => {
            const date = new Date(i.dateTime).toLocaleDateString();

            if (datePrev !== date) {
                datePrev = date;

                if (i.x >= 120 && i.x <= 880 && (i.x - xPrev >= 100 || i.x - xPrev === 0)) {
                    xPrev = i.x;
                    xAxis.push(
                        <React.Fragment key={`xAxis-${date}`}>
                            <line x1={i.x} y1={0} x2={i.x} y2={470} stroke="#F7F7F8" />
                            <text x={i.x} y={500} fill="#9393A1" textAnchor="middle">{date}</text>
                        </React.Fragment>
                    );
                }
            }

            if (i.x >= 120 && i.x <= 880 && index !== array.length - 1 && array[index + 1].x >= 120 && array[index + 1].x <= 880) {
                const y1 = valueMin === valueMax ? 420 : interpolate(i.close, [valueMin, valueMax], [420, 20]);
                const y2 = valueMin === valueMax ? 420 : interpolate(array[index + 1].close, [valueMin, valueMax], [420, 20]);
                const color = array[index + 1].close >= i.close ? '#3CD280' : '#FF5050';
                line.push(<line key={`line-${i.x}-${array[index + 1].x}`} x1={i.x} y1={y1} x2={array[index + 1].x} y2={y2} strokeWidth={2} stroke={color} />);
            }
        });

        return {
            xAxis,
            line,
        };
    }, [dataWithXOffset, valueMin, valueMax]);

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

        if (!item || (item.x < 120 || item.x > 880)) {
            return null;
        }

        const yCircle = valueMin === valueMax ? 420 : interpolate(item.close, [valueMin, valueMax], [420, 20]);
        const xRect = item.x >= 500 ? item.x - 310 : item.x + 10;
        const yRect = yCircle - 50 <= 20 ? 20 : yCircle >= 370 ? 370 : yCircle - 20;
        const dateTime = new Date(item.dateTime);

        return (
            <>
                <line x1={item.x} y1={0} x2={item.x} y2={470} stroke="#9393A1" />
                <circle cx={item.x} cy={yCircle} r={5} fill="#9393A1" />
                <rect x={xRect} y={yRect} width={300} height={50} fill="#FFFFFF" stroke="#9393A1" />
                <text x={xRect + 10} y={yRect + 20} fill="#646478" fontWeight="bold">Закрытие</text>
                <text x={xRect + 290} y={yRect + 20} fill="#646478" textAnchor="end">{item.close} &#8381;</text>
                <text x={xRect + 10} y={yRect + 40} fill="#646478" fontWeight="bold">Дата</text>
                <text x={xRect + 290} y={yRect + 40} fill="#646478" textAnchor="end">{dateTime.toLocaleDateString()}, {dateTime.toLocaleTimeString()}</text>
            </>
        );
    }, [isMoving, xClient, dataWithXOffset, valueMin, valueMax]);

    const handleStart = useCallback(e => {
        setMoving(true);
        setXClient(e.nativeEvent.touches?.[0].clientX ?? e.nativeEvent.clientX);
    }, []);

    const handleMove = useCallback(e => {
        const xClientTemp = e.nativeEvent.touches?.[0].clientX ?? e.nativeEvent.clientX;

        if (isMoving && props.data.length > 1) {
            setXOffset(xOffsetPrev => {
                const xOffsetTemp = xOffsetPrev + xClient - xClientTemp;
                return xOffsetTemp <= xMin - 120 ? xMin - 120 : xOffsetTemp >= 0 ? 0 : xOffsetTemp;
            });
        }

        setXClient(xClientTemp);
    }, [props.data, xClient, xMin]);

    const handleFinish = useCallback(() => setMoving(false), []);

    return (
        <svg
            className={styles.lineChartV2}
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
            {props.data.length ? (
                <>
                    {xAxis}
                    {yAxis}
                    {line}
                    {tooltip}
                </>
            ) : (
                <>
                    <rect x={0} y={0} width={1000} height={500} fill="#F7F7F8" />
                    <text x={500} y={250} fill="#9393A1" alignmentBaseline="middle" textAnchor="middle">
                        В настоящее время данные не доступны. Попробуйте позднее.
                    </text>
                </>
            )}
        </svg>
    );
}
