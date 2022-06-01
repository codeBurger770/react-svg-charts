import React, { useCallback, useMemo, useRef, useState } from "react";
import { interpolate } from "../../utils";
import styles from "./LineChartV3.module.css";

export interface ILineChartV3Props {
    data: {
        dateTime: string;
        value: number;
    }[];
}

export function LineChartV3(props: ILineChartV3Props) {
    const ref = useRef<SVGSVGElement>();
    const [xClient, setXClient] = useState(0);

    const { dataWithX, valueMin, valueMax, valueCurrent, intervalBetweenValues } = useMemo(() => {
        const intervalBetweenValues = props.data.length > 1 ? 880 / (props.data.length - 1) : 0;
        const dataWithX = [...props.data].reverse().map((i, index) => ({
            ...i,
            value: +i.value.toFixed(6),
            x: 990 - index * intervalBetweenValues,
        })).reverse();
        const values = dataWithX.map(i => i.value);
        return {
            dataWithX,
            valueMin: Math.min(...values),
            valueMax: Math.max(...values),
            valueCurrent: dataWithX.length ? dataWithX[dataWithX.length - 1].value : 0,
            intervalBetweenValues,
        };
    }, [props.data]);

    const xAxis = useMemo(() => {
        const xAxis: JSX.Element[] = [];
        let dateTimePrev = '';
        let xPrev = 0;

        dataWithX.forEach(i => {
            const date = new Date(i.dateTime);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth()).padStart(2, '0');
            const year = date.getFullYear();
            const dateTime = `${day}.${month}.${year}`;

            if (dateTimePrev !== dateTime) {
                dateTimePrev = dateTime;

                if (i.x - xPrev >= (i.x >= 940 ? 150 : 100)) {
                    xPrev = i.x;
                    xAxis.push(
                        <React.Fragment key={dateTime}>
                            <line x1={i.x} y1={0} x2={i.x} y2={475} stroke="#F7F7F8" />
                            <text x={i.x} y={500} fill="#9393A1" textAnchor={i.x >= 940 ? 'end' : 'middle'}>{dateTime}</text>
                        </React.Fragment>
                    );
                }
            }
        });

        return xAxis;
    }, [dataWithX, valueMin, valueMax]);

    const yAxis = useMemo(() => {
        if (valueMin === valueMax) {
            const value = +valueMin.toFixed(6);
            return (
                <>
                    <line x1={100} y1={250} x2={1000} y2={250} stroke="#F7F7F8" />
                    <text x={0} y={250} fill="#9393A1" alignmentBaseline="middle">{value}</text>
                </>
            );
        }

        const yAxis = [];
        const intervalBetweenValueMaxAndValueMin = (valueMax - valueMin) / 4;

        for (let i = 0; i < 5; i++) {
            const value = +(valueMax - i * intervalBetweenValueMaxAndValueMin).toFixed(6);
            const y = i * 100 + 50;
            yAxis.push(
                <React.Fragment key={value}>
                    <line x1={100} y1={y} x2={1000} y2={y} stroke="#F7F7F8" />
                    <text x={0} y={y} fill="#9393A1" alignmentBaseline="middle">{value}</text>
                </React.Fragment>
            );
        }

        return yAxis;
    }, [valueMin, valueMax]);

    const yAxisCurrent = useMemo(() => {
        const yLine = valueMin === valueMax
            ? 250
            : valueCurrent < valueMin
                ? 465
                : valueCurrent > valueMax
                    ? 35
                    : interpolate(valueCurrent, [valueMin, valueMax], [450, 50]);
        let yText = yLine;

        for (let i = 0; i < 5; i++) {
            if (yText > i * 100 + 35 && yText <= i * 100 + 50) {
                yText = i * 100 + 35;
            }

            if (yText > i * 100 + 50 && yText < i * 100 + 65) {
                yText = i * 100 + 65;
            }
        }

        return (
            <>
                {yLine >= 50 && yLine <= 450 && (
                    <line x1={100} y1={yLine} x2={1000} y2={yLine} strokeDasharray="10 5" stroke="#F26126" />
                )}
                <text x={0} y={yText} fill="#F26126" alignmentBaseline="middle">{valueCurrent}</text>
            </>
        );
    }, [valueMin, valueMax, valueCurrent]);

    const line = useMemo(() => {
        const points = dataWithX.reduce((sum, i) => {
            const y = valueMin === valueMax ? 250 : interpolate(i.value, [valueMin, valueMax], [450, 50]);
            return `${sum} ${i.x},${y}`;
        }, '');
        return (
            <polyline points={points} strokeWidth={2} stroke="#5AA9F9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        );
    }, [dataWithX, valueMin, valueMax]);

    const tooltip = useMemo(() => {
        if (!dataWithX.length) {
            return null;
        }

        const boundingClientRect = ref.current?.getBoundingClientRect();
        const x = (xClient - (boundingClientRect?.x ?? 0)) / (boundingClientRect?.width ?? 0) * 1000;
        const index = Math.round((x - 110) / intervalBetweenValues);
        const item = dataWithX[index < 0 ? 0 : index > dataWithX.length - 1 ? dataWithX.length - 1 : index];

        if (!item) {
            return null;
        }

        const yCircle = valueMin === valueMax ? 250 : interpolate(item.value, [valueMin, valueMax], [450, 50]);
        const xRect = item.x >= 500 ? item.x - 160 : item.x + 10;
        const yRect = yCircle - 50 <= 50 ? 50 : yCircle >= 400 ? 400 : yCircle - 25;
        const date = new Date(item.dateTime);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth()).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const dateTime = `${day}.${month}.${year}, ${hours}:${minutes}`;
        return (
            <>
                <line x1={item.x} y1={0} x2={item.x} y2={475} stroke="#9393A1" />
                <circle cx={item.x} cy={yCircle} r={5} fill="#9393A1" />
                <rect x={xRect} y={yRect} width={150} height={50} fill="#FFFFFF" stroke="#9393A1" />
                <text x={xRect + 10} y={yRect + 20} fill="#646478">{item.value}</text>
                <text x={xRect + 10} y={yRect + 40} fill="#646478">{dateTime}</text>
            </>
        );
    }, [xClient, dataWithX, valueMin, valueMax, intervalBetweenValues]);

    const handleStart = useCallback(e => setXClient(e.nativeEvent.touches?.[0].clientX ?? e.nativeEvent.clientX), []);

    return (
        <svg
            className={styles.chart}
            viewBox="0 0 1000 500"
            ref={ref as any}
            onMouseDown={handleStart}
            onMouseMove={handleStart}
            onTouchStart={handleStart}
            onTouchMove={handleStart}
        >
            {props.data.length ? (
                <>
                    <rect x={0} y={0} width={1000} height={500} fill='#FFFFFF' />
                    {xAxis}
                    {yAxis}
                    {yAxisCurrent}
                    {line}
                    {tooltip}
                </>
            ) : (
                <>
                    <rect x={0} y={0} width={1000} height={500} fill="#F7F7F8" />
                    <text x={500} y={250} fill="#9393A1" alignmentBaseline="middle" textAnchor="middle">
                        Нет данных для отображения
                    </text>
                </>
            )}
        </svg>
    );
}
