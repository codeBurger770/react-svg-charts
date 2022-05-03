import { useEffect, useMemo, useState } from "react";
import styles from "./DonutChart.module.css";

const WIDTH = 1000;
const HEIGHT = WIDTH / 2;
const STROKE_WIDTH = 50;
const STROKE_WIDTH_ACTIVE = STROKE_WIDTH * 1.5;
const STROKE_COLORS = ['#5A96DC', '#42D66C', '#CB97FF', '#FC5757', '#2FCBFC', '#4A5AAF', '#FDBF9D', '#FFEC8A', '#5DCC6F', '#F06CB3', '#4AE9C3', '#F98544'];
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const RADIUS = (HEIGHT - STROKE_WIDTH_ACTIVE) / 2;
const FONT_SIZE = 32;
const PERCENT_PRECISION = 0.0001;
const PERCENT_FRACTION_DIGITS = 4;

export interface IDonutChartProps {
    data: number[];
}

export function DonutChart(props: IDonutChartProps) {
    const [indexActive, setIndexActive] = useState<number>();

    useEffect(() => {
        setIndexActive(undefined);
    }, [props.data]);

    const dataWithPercent = useMemo(() => {
        if (!props.data.length) {
            return [];
        }

        const sum = props.data.reduce((sum, i) => sum + i, 0);
        const dataWithPercent = props.data.map(i => {
            const percent = i / sum;
            return {
                value: i,
                percent: percent !== 0 && percent < PERCENT_PRECISION ? PERCENT_PRECISION : +percent.toFixed(PERCENT_FRACTION_DIGITS),
            };
        }).sort((i, j) => j.value - i.value);
        const percentError = 1 - dataWithPercent.reduce((sum, i) => sum + i.percent, 0);
        const percentErrorSign = Math.sign(percentError);
        let percentErrorCount = Math.abs(Math.round(percentError / PERCENT_PRECISION)) || 0;
        let i = 0;

        while (percentErrorCount) {
            const item = dataWithPercent[i % dataWithPercent.length];

            if (percentErrorSign !== -1 || item.percent > PERCENT_PRECISION) {
                item.percent = +(item.percent + percentErrorSign * PERCENT_PRECISION).toFixed(PERCENT_FRACTION_DIGITS);
                percentErrorCount--;
            }

            i++;
        }

        return dataWithPercent;
    }, [props.data]);

    const { paths, info } = useMemo(() => {
        const paths: JSX.Element[] = [];
        let angle = -Math.PI / 2;
        let xStart = CENTER_X;
        let yStart = STROKE_WIDTH_ACTIVE / 2;

        dataWithPercent.forEach((i, index) => {
            angle += 2 * Math.PI * (i.percent > 0.5 ? 0.5 : i.percent);
            let xFinish = CENTER_X + RADIUS * Math.cos(angle);
            let yFinish = CENTER_Y + RADIUS * Math.sin(angle);
            let d = `M ${xStart} ${yStart} A ${RADIUS} ${RADIUS} 0 0 1 ${xFinish} ${yFinish}`;


            if (i.percent > 0.5) {
                angle += 2 * Math.PI * (i.percent - 0.5);
                xFinish = CENTER_X + RADIUS * Math.cos(angle);
                yFinish = CENTER_Y + RADIUS * Math.sin(angle);
                d += ` A ${RADIUS} ${RADIUS} 0 0 1 ${xFinish} ${yFinish}`;
            }

            xStart = xFinish;
            yStart = yFinish;

            paths.push(
                <path
                    key={index}
                    className={styles.chart__path}
                    d={d}
                    strokeWidth={index === indexActive ? STROKE_WIDTH_ACTIVE : STROKE_WIDTH}
                    stroke={STROKE_COLORS[index % STROKE_COLORS.length]}
                    fill="none"
                    onClick={() => setIndexActive(index)}
                />
            );
        });

        return {
            paths,
            info: indexActive == null ? null : (
                <>
                    <text x={CENTER_X} y={CENTER_Y - FONT_SIZE / 2} fontSize={FONT_SIZE} fill="#9393A1" alignmentBaseline="middle" textAnchor="middle">
                        {dataWithPercent[indexActive].value}
                    </text>
                    <text x={CENTER_X} y={CENTER_Y + FONT_SIZE / 2} fontSize={FONT_SIZE} fill="#9393A1" alignmentBaseline="middle" textAnchor="middle">
                        {(dataWithPercent[indexActive].percent * 100).toFixed(PERCENT_FRACTION_DIGITS / 2)}%
                    </text>
                </>
            ),
        };
    }, [indexActive, dataWithPercent]);

    return (
        <svg className={styles.chart} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
            {props.data.length ? (
                <>
                    {paths}
                    {info}
                </>
            ) : (
                <>
                    <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#F7F7F8" />
                    <text x={CENTER_X} y={CENTER_Y} fontSize={FONT_SIZE / 2} fill="#9393A1" alignmentBaseline="middle" textAnchor="middle">
                        В настоящее время данные не доступны. Попробуйте позднее.
                    </text>
                </>
            )}
        </svg>
    );
}
