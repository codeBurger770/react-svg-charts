import React, { useCallback, useMemo, useRef, useState } from "react";
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

    const { candlesticksWithX, xMin } = useMemo(() => {
        const candlesticksWithX = [...props.data].reverse().map((i, index) => ({
            ...i,
            x: 875 - index * 20,
        })).reverse();
        return {
            candlesticksWithX,
            xMin: candlesticksWithX[0].x,
        };
    }, [props.data]);

    const { candlesticksWithXOffset, valueMin, valueMax } = useMemo(() => {
        const candlesticksWithXOffset = candlesticksWithX.map(i => ({
            ...i,
            x: i.x - xOffset,
        }));
        const values = candlesticksWithXOffset
            .filter(i => i.x >= 125 && i.x <= 875)
            .map(i => [i.high, i.low, i.open, i.close])
            .flat();
        return {
            candlesticksWithXOffset,
            valueMin: Math.min(...values),
            valueMax: Math.max(...values),
        };
    }, [candlesticksWithX, xOffset]);

    const yAxis = useMemo(() => {
        const yAxis = [];
        const { close } = candlesticksWithXOffset[candlesticksWithXOffset.length - 1];

        if (close < valueMin) {
            yAxis.push(<text key="yAxis-close" x="990" y="425" fill="#F26126" textAnchor="end" alignmentBaseline="middle">{close} &#8381;</text>);
        } else if (close > valueMax) {
            yAxis.push(<text key="yAxis-close" x="990" y="25" fill="#F26126" textAnchor="end" alignmentBaseline="middle">{close} &#8381;</text>);
        } else {
            const y = interpolate(close, [valueMin, valueMax], [425, 25]);
            yAxis.push(
                <React.Fragment key="yAxis-close">
                    <line x1="100" y1={y} x2="900" y2={y} stroke="#F26126" strokeDasharray="10 5" />
                    <text x="990" y={y} fill="#F26126" textAnchor="end" alignmentBaseline="middle">{close} &#8381;</text>
                </React.Fragment>
            );
        }

        const interval = (valueMax - valueMin) / 4;

        for (let i = 0; i < 5; i++) {
            const value = (valueMax - i * interval).toFixed(4);
            const y = i * 100 + 25;
            yAxis.push(
                <React.Fragment key={`yAxis-${value}`}>
                    <line x1="100" y1={y} x2="900" y2={y} stroke="#F7F7F8" />
                    <text x="10" y={y} fill="#9393A1" alignmentBaseline="middle">{value} &#8381;</text>
                </React.Fragment>
            );
        }

        return yAxis;
    }, [candlesticksWithXOffset, valueMin, valueMax]);

    const { xAxis, candlesticks } = useMemo(() => {
        const xAxis: JSX.Element[] = [];
        const candlesticks: JSX.Element[] = [];
        let datePrev = '';

        candlesticksWithXOffset.forEach(i => {
            const date = new Date(i.dateTime).toLocaleDateString();

            if (datePrev !== date) {
                datePrev = date;

                if (i.x >= 125 && i.x <= 875) {
                    xAxis.push(
                        <React.Fragment key={`xAxis-${date}`}>
                            <line x1={i.x} y1="0" x2={i.x} y2="450" stroke="#F7F7F8" />
                            <text x={i.x} y="485" fill="#9393A1" textAnchor="middle" alignmentBaseline="middle">{date}</text>
                        </React.Fragment>
                    );
                }
            }

            if (i.x >= 125 && i.x <= 875) {
                const high = interpolate(i.high, [valueMin, valueMax], [425, 25]);
                const low = interpolate(i.low, [valueMin, valueMax], [425, 25]);
                const open = interpolate(i.open, [valueMin, valueMax], [425, 25]);
                const close = interpolate(i.close, [valueMin, valueMax], [425, 25]);
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
    }, [candlesticksWithXOffset]);

    const tooltip = useMemo(() => {
        if (!ref.current || isMoving || !xClient) {
            return null;
        }

        const boundingClientRect = ref.current.getBoundingClientRect();
        let x = (xClient - boundingClientRect.x) / boundingClientRect.width * 1000;
        let candlestickHovering: any;
        let intervalPrev = 1000;
        candlesticksWithXOffset.forEach(i => {
            const interval = Math.abs(i.x - x);

            if (interval <= 10 && interval < intervalPrev) {
                intervalPrev = interval;
                candlestickHovering = i;
            }
        });

        if (!candlestickHovering || (candlestickHovering.x < 125 || candlestickHovering.x > 875)) {
            return null;
        }

        x = candlestickHovering.x >= 500 ? candlestickHovering.x - 320 : candlestickHovering.x + 20;
        const dateTime = new Date(candlestickHovering.dateTime);

        return (
            <>
                <rect x={candlestickHovering.x - 10} y="0" width={20} height="450" fill="#9393A1" fillOpacity="0.5" />
                <rect x={x} y="160" width={300} height="130" fill="#FFFFFF" stroke="#9393A1" />
                <text x={x + 10} y="175" fill="#646478" alignmentBaseline="middle" fontWeight="bold">Открытие</text>
                <text x={x + 290} y="175" fill="#646478" textAnchor="end" alignmentBaseline="middle">{candlestickHovering.open} &#8381;</text>
                <text x={x + 10} y="195" fill="#646478" alignmentBaseline="middle" fontWeight="bold">Закрытие</text>
                <text x={x + 290} y="195" fill="#646478" textAnchor="end" alignmentBaseline="middle">{candlestickHovering.close} &#8381;</text>
                <text x={x + 10} y="215" fill="#646478" alignmentBaseline="middle" fontWeight="bold">Максимум</text>
                <text x={x + 290} y="215" fill="#646478" textAnchor="end" alignmentBaseline="middle">{candlestickHovering.high} &#8381;</text>
                <text x={x + 10} y="235" fill="#646478" alignmentBaseline="middle" fontWeight="bold">Минимум</text>
                <text x={x + 290} y="235" fill="#646478" textAnchor="end" alignmentBaseline="middle">{candlestickHovering.low} &#8381;</text>
                <text x={x + 10} y="255" fill="#646478" alignmentBaseline="middle" fontWeight="bold">Объём</text>
                <text x={x + 290} y="255" fill="#646478" textAnchor="end" alignmentBaseline="middle">{candlestickHovering.volume}</text>
                <text x={x + 10} y="275" fill="#646478" alignmentBaseline="middle" fontWeight="bold">Дата</text>
                <text x={x + 290} y="275" fill="#646478" textAnchor="end" alignmentBaseline="middle">{dateTime.toLocaleDateString()}, {dateTime.toLocaleTimeString()}</text>
            </>
        );
    }, [isMoving, xClient, candlesticksWithXOffset]);

    const start = useCallback((e: any) => {
        setMoving(true);
        setXClient(e.clientX ?? e.touches[0].clientX);
    }, []);

    const move = useCallback((e: any) => {
        if (isMoving) {
            setXOffset(xOffsetPrev => {
                const xOffset = xOffsetPrev + xClient - (e.clientX ?? e.touches[0].clientX);
                return xOffset <= xMin - 125
                    ? xMin - 125
                    : xOffset >= 0
                        ? 0
                        : xOffset;
            });
        }

        setXClient(e.clientX ?? e.touches[0].clientX);
    }, [xClient, xMin]);

    const end = useCallback(() => setMoving(false), []);

    return (
        <svg
            className={styles.candlestickChart}
            viewBox="0 0 1000 500"
            ref={ref as any}
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
        >
            {xAxis}
            {yAxis}
            {candlesticks}
            {tooltip}
        </svg>
    );
}
