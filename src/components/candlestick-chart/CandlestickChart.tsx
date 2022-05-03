import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { interpolate } from "../../utils";
import styles from "./CandlestickChart.module.css";

export interface ICandlestickChartProps {
    data: {
        dateTime: string;
        high: number;
        low: number;
        open: number;
        close: number;
        volume: number;
    }[];
}

export function CandlestickChart(props: ICandlestickChartProps) {
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
            high: +i.high.toFixed(6),
            low: +i.low.toFixed(6),
            open: +i.open.toFixed(6),
            close: +i.close.toFixed(6),
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
            .map(i => [i.high, i.low, i.open, i.close])
            .flat();
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
            const y = i * 100 + 25;
            yAxis.push(
                <React.Fragment key={`yAxis-${value}`}>
                    <line x1={100} y1={y} x2={900} y2={y} stroke="#F7F7F8" />
                    <text x={0} y={y} fill="#9393A1" alignmentBaseline="middle">{value}</text>
                </React.Fragment>
            );
        }

        const { close } = dataWithXOffset[dataWithXOffset.length - 1];

        if (close < valueMin) {
            yAxis.push(<text key="yAxis-current" x={1000} y={425} fill="#F26126" alignmentBaseline="middle" textAnchor="end">{close}</text>);
        } else if (close > valueMax) {
            yAxis.push(<text key="yAxis-current" x={1000} y={25} fill="#F26126" alignmentBaseline="middle" textAnchor="end">{close}</text>);
        } else {
            const y = valueMin === valueMax ? 425 : interpolate(close, [valueMin, valueMax], [425, 25]);
            yAxis.push(
                <React.Fragment key="yAxis-current">
                    <line x1={100} y1={y} x2={900} y2={y} strokeDasharray="10 5" stroke="#F26126" />
                    <text x={1000} y={y} fill="#F26126" alignmentBaseline="middle" textAnchor="end">{close}</text>
                </React.Fragment>
            );
        }

        return yAxis;
    }, [dataWithXOffset, valueMin, valueMax]);

    const { xAxis, candlesticks } = useMemo(() => {
        const xAxis: JSX.Element[] = [];
        const candlesticks: JSX.Element[] = [];
        let datePrev = '';
        let xPrev = dataWithXOffset.length ? dataWithXOffset[0].x : 0;

        dataWithXOffset.forEach(i => {
            const date = new Date(i.dateTime).toLocaleDateString('ru');

            if (datePrev !== date) {
                datePrev = date;

                if (i.x >= 120 && i.x <= 880 && (i.x - xPrev >= 100 || i.x - xPrev === 0)) {
                    xPrev = i.x;
                    xAxis.push(
                        <React.Fragment key={`xAxis-${date}`}>
                            <line x1={i.x} y1={0} x2={i.x} y2={475} stroke="#F7F7F8" />
                            <text x={i.x} y={500} fill="#9393A1" textAnchor="middle">{date}</text>
                        </React.Fragment>
                    );
                }
            }

            if (i.x >= 120 && i.x <= 880) {
                const high = valueMin === valueMax ? 425 : interpolate(i.high, [valueMin, valueMax], [425, 25]);
                const low = valueMin === valueMax ? 425 : interpolate(i.low, [valueMin, valueMax], [425, 25]);
                const open = valueMin === valueMax ? 425 : interpolate(i.open, [valueMin, valueMax], [425, 25]);
                const close = valueMin === valueMax ? 425 : interpolate(i.close, [valueMin, valueMax], [425, 25]);
                const color = close >= open ? '#3CD280' : '#FF5050';
                candlesticks.push((
                    <React.Fragment key={`candlestick-${i.x}`}>
                        <line x1={i.x} y1={high} x2={i.x} y2={low} stroke={color} />
                        <rect x={i.x - 5} y={Math.min(open, close)} width={10} height={Math.abs(open - close) || 1} fill={color} />
                    </React.Fragment>
                ));
            }
        });

        return {
            xAxis,
            candlesticks,
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

        const xRect = item.x >= 500 ? item.x - 280 : item.x + 20;
        const dateTime = new Date(item.dateTime).toLocaleTimeString('ru', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

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
            className={styles.chart}
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
                    {candlesticks}
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
