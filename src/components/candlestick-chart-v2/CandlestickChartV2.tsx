import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { interpolate } from "../../utils";
import styles from "./CandlestickChartV2.module.css";

export interface ICandlestickChartV2Props {
    data: {
        dateTime: string;
        high: number;
        low: number;
        open: number;
        close: number;
        volume: number;
    }[];
}

export function CandlestickChartV2(props: ICandlestickChartV2Props) {
    const ref = useRef<SVGSVGElement>();
    const [isMoving, setMoving] = useState(false);
    const [xClient, setXClient] = useState(0);
    const [xOffset, setXOffset] = useState(0);

    useEffect(() => {
        setXOffset(0);
    }, [props.data]);

    const { dataWithX, valueCurrent, intervalBetweenValues, xMin } = useMemo(() => {
        const intervalBetweenValues = props.data.length > 1 ? Math.max(880 / (props.data.length - 1), 20) : 0;
        const dataWithX = [...props.data].reverse().map((i, index) => ({
            ...i,
            high: +i.high.toFixed(6),
            low: +i.low.toFixed(6),
            open: +i.open.toFixed(6),
            close: +i.close.toFixed(6),
            x: 990 - index * intervalBetweenValues,
        })).reverse();
        return {
            dataWithX,
            valueCurrent: dataWithX.length ? dataWithX[dataWithX.length - 1].close : 0,
            intervalBetweenValues,
            xMin: dataWithX.length ? dataWithX[0].x : 0,
        };
    }, [props.data]);

    const { dataWithXOffset, valueMin, valueMax } = useMemo(() => {
        const dataWithXOffset = dataWithX.map(i => ({
            ...i,
            x: i.x - xOffset,
        }));
        const values = dataWithXOffset
            .filter(i => i.x >= 110 && i.x <= 990)
            .map(i => [i.high, i.low, i.open, i.close])
            .flat();
        return {
            dataWithXOffset,
            valueMin: Math.min(...values),
            valueMax: Math.max(...values),
        };
    }, [xOffset, dataWithX]);

    const xAxis = useMemo(() => {
        const xAxis: JSX.Element[] = [];
        let dateTimePrev = '';
        let xPrev = 0;

        dataWithXOffset.forEach(i => {
            const date = new Date(i.dateTime);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const dateTime = `${day}.${month}.${year}`;

            if (dateTimePrev !== dateTime) {
                dateTimePrev = dateTime;

                if (i.x >= 110 && i.x <= 990 && (!xPrev || i.x - xPrev >= (i.x >= 940 ? 150 : 100))) {
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
    }, [dataWithXOffset, valueMin, valueMax]);

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
                ? 470
                : valueCurrent > valueMax
                    ? 30
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

    const candlesticks = useMemo(() => {
        return dataWithXOffset.filter(i => i.x >= 110 && i.x <= 990).map(i => {
            const high = valueMin === valueMax ? 250 : interpolate(i.high, [valueMin, valueMax], [450, 50]);
            const low = valueMin === valueMax ? 250 : interpolate(i.low, [valueMin, valueMax], [450, 50]);
            const open = valueMin === valueMax ? 250 : interpolate(i.open, [valueMin, valueMax], [450, 50]);
            const close = valueMin === valueMax ? 250 : interpolate(i.close, [valueMin, valueMax], [450, 50]);
            const color = close >= open ? '#3CD280' : '#FF5050';
            return (
                <React.Fragment key={i.x}>
                    <line x1={i.x} y1={high} x2={i.x} y2={low} stroke={color} />
                    <rect x={i.x - 5} y={Math.min(open, close)} width={10} height={Math.abs(open - close) || 1} fill={color} />
                </React.Fragment>
            );
        });
    }, [dataWithXOffset, valueMin, valueMax]);

    const tooltip = useMemo(() => {
        if (!dataWithXOffset.length || isMoving) {
            return null;
        }

        const boundingClientRect = ref.current?.getBoundingClientRect();
        const x = (xClient - (boundingClientRect?.x ?? 0)) / (boundingClientRect?.width ?? 0) * 1000;
        const index = Math.round((x - 110) / intervalBetweenValues);
        const dataWithXOffsetFiltered = dataWithXOffset.filter(i => i.x >= 110 && i.x <= 990);
        const item = dataWithXOffsetFiltered[index < 0 ? 0 : index > dataWithXOffsetFiltered.length - 1 ? dataWithXOffsetFiltered.length - 1 : index];

        if (!item) {
            return null;
        }

        const xRect = item.x >= 500 ? item.x - 280 : item.x + 20;
        const date = new Date(item.dateTime);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const dateTime = `${day}.${month}.${year}, ${hours}:${minutes}`;
        return (
            <>
                <rect x={item.x - 10} y={0} width={20} height={475} fillOpacity={0.5} fill="#9393A1" />
                <rect x={xRect} y={160} width={260} height={130} fill="#FFFFFF" stroke="#9393A1" />
                <text x={xRect + 10} y={180} fill="#646478" fontWeight="bold">Открытие</text>
                <text x={xRect + 250} y={180} fill="#646478" textAnchor="end">{item.open}</text>
                <text x={xRect + 10} y={200} fill="#646478" fontWeight="bold">Закрытие</text>
                <text x={xRect + 250} y={200} fill="#646478" textAnchor="end">{item.close}</text>
                <text x={xRect + 10} y={220} fill="#646478" fontWeight="bold">Максимум</text>
                <text x={xRect + 250} y={220} fill="#646478" textAnchor="end">{item.high}</text>
                <text x={xRect + 10} y={240} fill="#646478" fontWeight="bold">Минимум</text>
                <text x={xRect + 250} y={240} fill="#646478" textAnchor="end">{item.low}</text>
                <text x={xRect + 10} y={260} fill="#646478" fontWeight="bold">Объём</text>
                <text x={xRect + 250} y={260} fill="#646478" textAnchor="end">{item.volume}</text>
                <text x={xRect + 10} y={280} fill="#646478" fontWeight="bold">Дата</text>
                <text x={xRect + 250} y={280} fill="#646478" textAnchor="end">{dateTime}</text>
            </>
        );
    }, [isMoving, xClient, dataWithXOffset]);

    const handlePointerDown = useCallback(e => {
        setMoving(true);
        setXClient(e.clientX);
    }, []);

    const handlePointerMove = useCallback(e => {
        const xClientTemp = e.clientX;
        
        if (isMoving && props.data.length > 1) {
            setXOffset(xOffsetPrev => {
                const xOffsetTemp = xOffsetPrev + xClient - xClientTemp;
                return xOffsetTemp <= xMin - 110 ? xMin - 110 : xOffsetTemp >= 0 ? 0 : xOffsetTemp;
            });
        }

        setXClient(xClientTemp);
    }, [props.data, isMoving, xClient, xMin]);

    const handlePointerUp = useCallback(() => setMoving(false), []);

    return (
        <svg
            className={styles.chart}
            viewBox="0 0 1000 500"
            ref={ref as any}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {props.data.length ? (
                <>
                    <rect x={0} y={0} width={1000} height={500} fill='#FFFFFF' />
                    {xAxis}
                    {yAxis}
                    {yAxisCurrent}
                    {candlesticks}
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
